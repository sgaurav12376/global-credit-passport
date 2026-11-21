package com.synergyresources.gcp.passport.crs;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.config.CrsProperties;
import com.synergyresources.gcp.passport.model.CrsCreditReport;
import com.synergyresources.gcp.passport.normalization.*;
import com.synergyresources.gcp.passport.repo.*;
import com.synergyresources.gcp.passport.surepass.NormalizedCreditReport;
import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.function.Supplier;
import org.springframework.core.io.ClassPathResource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CrsEquifaxService {
  private static final Logger log=LoggerFactory.getLogger(CrsEquifaxService.class);
  private static final String CONSENT_VERSION="crs-us-credit-v1";
  private final CrsEquifaxClient client; private final CrsEquifaxNormalizer normalizer; private final CrsProperties properties;
  private final CrsExperianNormalizer experianNormalizer; private final CrsTransUnionNormalizer transUnionNormalizer;
  private final PassportRepo passportRepo; private final CrsCreditReportRepo reportRepo; private final NormalizedEvidenceService evidenceService;
  private final CreditNormalizationAdapter creditAdapter; private final ObjectMapper mapper;
  public CrsEquifaxService(CrsEquifaxClient client,CrsEquifaxNormalizer normalizer,CrsProperties properties,PassportRepo passportRepo,
      CrsExperianNormalizer experianNormalizer,CrsTransUnionNormalizer transUnionNormalizer,CrsCreditReportRepo reportRepo,NormalizedEvidenceService evidenceService,CreditNormalizationAdapter creditAdapter,ObjectMapper mapper){
    this.client=client;this.normalizer=normalizer;this.properties=properties;this.passportRepo=passportRepo;this.reportRepo=reportRepo;
    this.evidenceService=evidenceService;this.creditAdapter=creditAdapter;this.mapper=mapper;
    this.experianNormalizer=experianNormalizer;this.transUnionNormalizer=transUnionNormalizer;
  }
  public List<View> fetchAll(UUID borrowerId,UUID passportId,String permissiblePurpose,CrsEquifaxClient.Request request){
    var passport=passportRepo.findByIdAndUserId(passportId,borrowerId).orElseThrow(()->new IllegalArgumentException("Passport not found"));
    if(!"US".equalsIgnoreCase(passport.getDestCountry())) throw new IllegalArgumentException("CRS U.S. credit is available only when the destination country is the United States");
    var basic=new CrsEquifaxClient.BasicRequest(request.firstName(),request.middleName(),request.lastName(),request.suffix(),request.dob(),request.ssn(),request.phone(),street(request),request.city(),request.state(),request.zip());
    List<View> available=new ArrayList<>();
    if(properties.fixtureMode()){
      attempt("EQUIFAX",available,()->persistFixture(borrowerId,passportId,permissiblePurpose,"EQUIFAX","fixtures/crs-equifax-synthetic.json"));
      attempt("EXPERIAN",available,()->persistFixture(borrowerId,passportId,permissiblePurpose,"EXPERIAN","fixtures/crs-experian-synthetic.json"));
      attempt("TRANSUNION",available,()->persistFixture(borrowerId,passportId,permissiblePurpose,"TRANSUNION","fixtures/crs-transunion-synthetic.json"));
    }else{
      attempt("EQUIFAX",available,()->persistLive(borrowerId,passportId,permissiblePurpose,"EQUIFAX",client.fetch(request)));
      attempt("EXPERIAN",available,()->persistLive(borrowerId,passportId,permissiblePurpose,"EXPERIAN",client.fetchExperian(basic)));
      attempt("TRANSUNION",available,()->persistLive(borrowerId,passportId,permissiblePurpose,"TRANSUNION",client.fetchTransUnion(basic)));
    }
    if(available.isEmpty()) throw new IllegalStateException("No U.S. credit-bureau records were available");
    return available;
  }
  private void attempt(String bureau,List<View> available,Supplier<View> operation){
    try{available.add(operation.get());}
    catch(RuntimeException error){log.warn("U.S. {} credit record was unavailable: {}",bureau,error.getMessage());}
  }
  public List<View> latestAll(UUID borrowerId,UUID passportId){
    passportRepo.findByIdAndUserId(passportId,borrowerId).orElseThrow(()->new IllegalArgumentException("Passport not found"));
    List<View> result=new ArrayList<>();for(String bureau:List.of("EQUIFAX","EXPERIAN","TRANSUNION"))reportRepo.findFirstByBorrowerIdAndPassportIdAndBureauAndStatusOrderByCreatedAtDesc(borrowerId,passportId,bureau,"SUCCESS").map(this::view).ifPresent(result::add);return result;
  }
  private View persistFixture(UUID borrowerId,UUID passportId,String purpose,String bureau,String resource){
    try(var input=new ClassPathResource(resource).getInputStream()){return persist(borrowerId,passportId,purpose,bureau,mapper.readTree(input),"crs-"+bureau.toLowerCase(Locale.ROOT)+"-fixture-"+UUID.randomUUID(),"fixture");}
    catch(IOException e){throw new IllegalStateException("CRS "+bureau+" fixture could not be loaded",e);}
  }
  private View persistLive(UUID borrowerId,UUID passportId,String purpose,String bureau,CrsEquifaxClient.Response response){return persist(borrowerId,passportId,purpose,bureau,response.body(),response.requestId(),"live");}
  private View persist(UUID borrowerId,UUID passportId,String purpose,String bureau,JsonNode response,String requestId,String mode){
    String reference="fixture".equals(mode)?requestId:text(response,"pdfReportId");if(reference==null)reference=requestId;if(reference==null)reference="crs-"+UUID.randomUUID();
    NormalizedCreditReport normalized=switch(bureau){case "EXPERIAN"->experianNormalizer.normalize(response,reference);case "TRANSUNION"->transUnionNormalizer.normalize(response,reference);default->normalizer.normalize(response,reference);};
    Instant now=Instant.now();CrsCreditReport entity=new CrsCreditReport();entity.setBorrowerId(borrowerId);entity.setPassportId(passportId);entity.setBureau(bureau);entity.setProviderReference(reference);entity.setRequestId(requestId);entity.setCreditScore(normalized.creditScore());entity.setNormalizedReport(mapper.valueToTree(normalized));entity.setConsentVersion(CONSENT_VERSION);entity.setConsentedAt(now);entity.setDataMode(mode);entity.setPermissiblePurpose(purpose);entity.setInquiryType(properties.inquiryType()==null?"UNCONFIRMED":properties.inquiryType().toUpperCase(Locale.ROOT));entity.setStatus("SUCCESS");entity=reportRepo.saveAndFlush(entity);
    evidenceService.saveCredit(borrowerId,passportId,creditAdapter.normalize(normalized,new NormalizationContext("US","CRS",bureau,reference,CONSENT_VERSION,now,entity.getCreatedAt(),null)));return view(entity);
  }
  private String street(CrsEquifaxClient.Request r){return String.join(" ",List.of(r.houseNumber(),r.streetName())).trim();}
  @Transactional
  public View fetch(UUID borrowerId,UUID passportId,String permissiblePurpose,CrsEquifaxClient.Request request){
    var passport=passportRepo.findByIdAndUserId(passportId,borrowerId).orElseThrow(()->new IllegalArgumentException("Passport not found"));
    if(!"US".equalsIgnoreCase(passport.getDestCountry())) throw new IllegalArgumentException("CRS Equifax is available only when the destination country is the United States");
    Instant consentedAt=Instant.now(); JsonNode response; String requestId; String mode;
    if(properties.fixtureMode()){
      try(var input=new ClassPathResource("fixtures/crs-equifax-synthetic.json").getInputStream()){response=mapper.readTree(input);}
      catch(IOException e){throw new IllegalStateException("CRS fixture could not be loaded",e);}
      requestId="crs-equifax-fixture-"+UUID.randomUUID(); mode="fixture";
    }else{var result=client.fetch(request);response=result.body();requestId=result.requestId();mode="live";}
    String reference="fixture".equals(mode)?requestId:text(response,"pdfReportId"); if(reference==null) reference=requestId; if(reference==null) reference="crs-"+UUID.randomUUID();
    NormalizedCreditReport normalized=normalizer.normalize(response,reference);
    CrsCreditReport entity=new CrsCreditReport(); entity.setBorrowerId(borrowerId);entity.setPassportId(passportId);entity.setBureau("EQUIFAX");
    entity.setProviderReference(reference);entity.setRequestId(requestId);entity.setCreditScore(normalized.creditScore());
    entity.setNormalizedReport(mapper.valueToTree(normalized));entity.setConsentVersion(CONSENT_VERSION);
    entity.setConsentedAt(consentedAt);entity.setDataMode(mode);entity.setPermissiblePurpose(permissiblePurpose);
    entity.setInquiryType(properties.inquiryType()==null?"UNCONFIRMED":properties.inquiryType().toUpperCase(Locale.ROOT));entity.setStatus("SUCCESS"); entity=reportRepo.saveAndFlush(entity);
    var context=new NormalizationContext("US","CRS","EQUIFAX",reference,CONSENT_VERSION,consentedAt,entity.getCreatedAt(),null);
    evidenceService.saveCredit(borrowerId,passportId,creditAdapter.normalize(normalized,context));
    return view(entity);
  }
  public View latest(UUID borrowerId,UUID passportId){
    passportRepo.findByIdAndUserId(passportId,borrowerId).orElseThrow(()->new IllegalArgumentException("Passport not found"));
    return reportRepo.findFirstByBorrowerIdAndPassportIdAndStatusOrderByCreatedAtDesc(borrowerId,passportId,"SUCCESS")
        .map(this::view).orElseThrow(()->new IllegalArgumentException("No U.S. Equifax credit report exists for this passport"));
  }
  private View view(CrsCreditReport r){return new View(r.getId(),r.getPassportId(),r.getBureau(),r.getCreditScore(),r.getNormalizedReport(),r.getDataMode(),r.getConsentedAt(),r.getCreatedAt());}
  private String text(JsonNode n,String field){String v=n.path(field).asText(null);return v==null||v.isBlank()?null:v;}
  public record View(UUID reportId,UUID passportId,String bureau,Integer creditScore,JsonNode normalizedReport,String dataMode,Instant consentedAt,Instant createdAt){}
}
