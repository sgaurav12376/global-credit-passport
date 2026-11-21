package com.synergyresources.gcp.passport.crs;

import com.fasterxml.jackson.databind.JsonNode;
import com.synergyresources.gcp.passport.surepass.NormalizedCreditReport;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class CrsExperianNormalizer {
  public NormalizedCreditReport normalize(JsonNode root,String reference){
    JsonNode trade=root.path("customData").path("summaries").path("tradeSummary");
    JsonNode derog=root.path("customData").path("summaries").path("derogatorySummary");
    JsonNode risk=root.path("riskModel").isArray()&&root.path("riskModel").size()>0?root.path("riskModel").get(0):root.path("riskModel");
    Integer score=integer(risk,"score");
    List<String> factors=new ArrayList<>(); if(risk.path("scoreFactors").isArray())risk.path("scoreFactors").forEach(n->{String v=n.path("code").asText(null);if(v!=null)factors.add(v);});
    List<NormalizedCreditReport.Tradeline> lines=new ArrayList<>();
    if(root.path("tradeline").isArray())root.path("tradeline").forEach(n->lines.add(new NormalizedCreditReport.Tradeline(mask(n.path("accountNumber").asText(null)),n.path("accountType").asText(null),n.path("openOrClosed").asText(null),decimal(n,"balanceAmount"),decimal(n.path("enhancedPaymentData"),"creditLimitAmount","highBalanceAmount"),decimal(n,"amountPastDue"),decimal(n.path("enhancedPaymentData"),"chargeoffAmount"),max(integer(n,"delinquencies30Days"),integer(n,"delinquencies60Days"),integer(n,"delinquencies90to180Days")),n.path("openDate").asText(null),n.path("balanceDate").asText(null))));
    var summary=new NormalizedCreditReport.Summary(integer(trade,"tradesCount"),integer(trade,"openTradesCount"),null,sum(integer(derog,"get_30DayLates"),integer(derog,"get_60DayLates"),integer(derog,"get_90DayLates")),null,null,decimal(trade,"balanceTotal"),decimal(trade,"highCreditTotal"),months(trade.path("oldestTradeline").asText(null)),integer(derog,"inquiriesCount"),max(integer(derog,"get_30DayLates")!=null&&integer(derog,"get_30DayLates")>0?30:null,integer(derog,"get_60DayLates")!=null&&integer(derog,"get_60DayLates")>0?60:null,integer(derog,"get_90DayLates")!=null&&integer(derog,"get_90DayLates")>0?90:null),integer(derog,"chargeOffsCount"));
    return new NormalizedCreditReport("EXPERIAN",reference,score,300,850,factors,summary,lines,List.of("Synthetic CRS Experian fixture; not a consumer report"));
  }
  private Integer integer(JsonNode n,String...f){for(String x:f){String v=n.path(x).asText(null);if(v!=null)try{return Integer.valueOf(v);}catch(Exception ignored){}}return null;}
  private BigDecimal decimal(JsonNode n,String...f){for(String x:f){String v=n.path(x).asText(null);if(v!=null)try{return new BigDecimal(v.replace(",",""));}catch(Exception ignored){}}return null;}
  private Integer sum(Integer...v){int s=0;boolean any=false;for(Integer x:v)if(x!=null){s+=x;any=true;}return any?s:null;}
  private Integer max(Integer...v){return Arrays.stream(v).filter(Objects::nonNull).max(Integer::compareTo).orElse(null);}
  private Integer months(String value){if(value==null)return null;try{return Integer.valueOf(value);}catch(Exception ignored){return null;}}
  private String mask(String v){return v==null?null:"****"+v.substring(Math.max(0,v.length()-4));}
}
