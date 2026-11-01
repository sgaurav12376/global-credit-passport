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
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CrsEquifaxService {
  private static final String CONSENT_VERSION="crs-us-credit-v1";
  private final CrsEquifaxClient client; private final CrsEquifaxNormalizer normalizer; private final CrsProperties properties;
  private final PassportRepo passportRepo; private final CrsCreditReportRepo reportRepo; private final NormalizedEvidenceService evidenceService;
  private final CreditNormalizationAdapter creditAdapter; private final ObjectMapper mapper;
  public CrsEquifaxService(CrsEquifaxClient client,CrsEquifaxNormalizer normalizer,CrsProperties properties,PassportRepo passportRepo,
      CrsCreditReportRepo reportRepo,NormalizedEvidenceService evidenceService,CreditNormalizationAdapter creditAdapter,ObjectMapper mapper){
    this.client=client;this.normalizer=normalizer;this.properties=properties;this.passportRepo=passportRepo;this.reportRepo=reportRepo;
    this.evidenceService=evidenceService;this.creditAdapter=creditAdapter;this.mapper=mapper;
  }
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
