package com.synergyresources.gcp.passport.crs;

import com.fasterxml.jackson.databind.JsonNode;
import com.synergyresources.gcp.passport.surepass.NormalizedCreditReport;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class CrsEquifaxNormalizer {
  public NormalizedCreditReport normalize(JsonNode root,String reference){
    JsonNode data=root.path("data"); if(data.isMissingNode()||data.isNull()) data=root;
    Integer score=integer(data,"creditScore","score","beaconScore","ficoScore");
    JsonNode summary=first(data,"summary","creditSummary","accountSummary");
    var normalizedSummary=new NormalizedCreditReport.Summary(
        integer(summary,"totalAccounts","numberOfAccounts"), integer(summary,"activeAccounts","openAccounts"),
        integer(summary,"closedAccounts"), integer(summary,"overdueOrDefaultAccounts","delinquentAccounts"),
        integer(summary,"securedAccounts"), integer(summary,"unsecuredAccounts"), decimal(summary,"currentBalance","totalBalance"),
        decimal(summary,"sanctionedAmount","totalCreditLimit","creditLimit"), integer(summary,"creditHistoryMonths"),
        integer(summary,"recentEnquiries","recentInquiries","inquiries"), integer(summary,"maximumDaysPastDue","maxDaysPastDue"),
        integer(summary,"writtenOffAccounts","chargeOffAccounts"));
    List<String> warnings=new ArrayList<>();
    if(score==null) warnings.add("CRS fixture did not include a native Equifax score");
    if(!hasSummary(normalizedSummary)) warnings.add("CRS response mapping is provisional until the account-specific sample is received");
    return new NormalizedCreditReport("EQUIFAX",reference,score,300,850,List.of(),normalizedSummary,List.of(),warnings);
  }
  private JsonNode first(JsonNode n,String... names){for(String name:names){JsonNode v=n.path(name);if(v.isObject())return v;}return n;}
  private Integer integer(JsonNode n,String... names){for(String name:names){JsonNode v=n.path(name);if(v.isNumber())return v.intValue();if(v.isTextual())try{return Integer.valueOf(v.asText());}catch(Exception ignored){}}return null;}
  private BigDecimal decimal(JsonNode n,String... names){for(String name:names){JsonNode v=n.path(name);if(v.isNumber())return v.decimalValue();if(v.isTextual())try{return new BigDecimal(v.asText().replace(",",""));}catch(Exception ignored){}}return null;}
  private boolean hasSummary(NormalizedCreditReport.Summary s){return s.totalAccounts()!=null||s.currentBalance()!=null||s.sanctionedAmount()!=null||s.creditHistoryMonths()!=null;}
}
