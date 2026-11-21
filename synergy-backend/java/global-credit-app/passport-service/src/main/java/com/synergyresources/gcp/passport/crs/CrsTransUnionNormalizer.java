package com.synergyresources.gcp.passport.crs;

import com.fasterxml.jackson.databind.JsonNode;
import com.synergyresources.gcp.passport.surepass.NormalizedCreditReport;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class CrsTransUnionNormalizer {
  public NormalizedCreditReport normalize(JsonNode root,String reference){
    JsonNode custom=root.path("customData");JsonNode summary=custom.path("creditSummary");
    Integer score=integer(custom,"score","nativeScore");
    List<String> factors=new ArrayList<>();if(custom.path("scoreFactors").isArray())custom.path("scoreFactors").forEach(n->factors.add(n.asText()));
    List<NormalizedCreditReport.Tradeline> lines=new ArrayList<>();if(custom.path("accounts").isArray())custom.path("accounts").forEach(n->lines.add(new NormalizedCreditReport.Tradeline(mask(n.path("accountNumber").asText(null)),n.path("accountType").asText(null),n.path("status").asText(null),decimal(n,"balance"),decimal(n,"creditLimit"),decimal(n,"pastDue"),decimal(n,"chargeOff"),integer(n,"maximumDaysPastDue"),n.path("dateOpened").asText(null),n.path("dateReported").asText(null))));
    var normalized=new NormalizedCreditReport.Summary(integer(summary,"totalAccounts"),integer(summary,"openAccounts"),integer(summary,"closedAccounts"),integer(summary,"delinquentAccounts"),null,null,decimal(summary,"totalBalance"),decimal(summary,"totalCreditLimit"),integer(summary,"creditHistoryMonths"),integer(summary,"recentInquiries"),integer(summary,"maximumDaysPastDue"),integer(summary,"chargeOffAccounts"));
    return new NormalizedCreditReport("TRANSUNION",reference,score,300,850,factors,normalized,lines,List.of("Synthetic CRS TransUnion fixture; not a consumer report"));
  }
  private Integer integer(JsonNode n,String...f){for(String x:f){JsonNode v=n.path(x);if(v.isNumber())return v.intValue();if(v.isTextual())try{return Integer.valueOf(v.asText());}catch(Exception ignored){}}return null;}
  private BigDecimal decimal(JsonNode n,String...f){for(String x:f){JsonNode v=n.path(x);if(v.isNumber())return v.decimalValue();if(v.isTextual())try{return new BigDecimal(v.asText().replace(",",""));}catch(Exception ignored){}}return null;}
  private String mask(String v){return v==null?null:"****"+v.substring(Math.max(0,v.length()-4));}
}
