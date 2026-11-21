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
    JsonNode model=data.path("models").isArray()&&data.path("models").size()>0?data.path("models").get(0):data;
    Integer score=integer(data,"creditScore","score","beaconScore","ficoScore"); if(score==null)score=integer(model,"score");
    JsonNode summary=first(data,"summary","creditSummary","accountSummary");
    List<NormalizedCreditReport.Tradeline> lines=new ArrayList<>();
    if(data.path("trades").isArray())data.path("trades").forEach(n->lines.add(new NormalizedCreditReport.Tradeline(mask(n.path("accountNumber").asText(null)),n.path("typeCodeDescription").asText(n.path("typeCode").asText(null)),n.path("ratingCodeDescription").asText(n.path("rating").asText(null)),decimal(n,"balance"),decimal(n,"highCredit"),decimal(n,"pastDue"),null,maxDpd(n),n.path("dateOpened").asText(null),n.path("dateReported").asText(null))));
    JsonNode documented=data.path("trades").isArray()?data:summary;
    var normalizedSummary=new NormalizedCreditReport.Summary(
        integer(summary,"totalAccounts","numberOfAccounts"), integer(summary,"activeAccounts","openAccounts"),
        integer(summary,"closedAccounts"), integer(summary,"overdueOrDefaultAccounts","delinquentAccounts"),
        integer(summary,"securedAccounts"), integer(summary,"unsecuredAccounts"), decimal(summary,"currentBalance","totalBalance"),
        decimal(summary,"sanctionedAmount","totalCreditLimit","creditLimit"), integer(summary,"creditHistoryMonths"),
        integer(summary,"recentEnquiries","recentInquiries","inquiries"), integer(summary,"maximumDaysPastDue","maxDaysPastDue"),
        integer(summary,"writtenOffAccounts","chargeOffAccounts"));
    if(data.path("trades").isArray()) normalizedSummary=summarize(lines,data);
    List<String> factors=new ArrayList<>();if(model.path("reasons").isArray())model.path("reasons").forEach(n->{String v=n.path("code").asText(null);if(v!=null)factors.add(v);});
    List<String> warnings=new ArrayList<>();
    if(score==null) warnings.add("CRS fixture did not include a native Equifax score");
    if(!hasSummary(normalizedSummary)) warnings.add("CRS response mapping is provisional until the account-specific sample is received");
    return new NormalizedCreditReport("EQUIFAX",reference,score,300,850,factors,normalizedSummary,lines,warnings);
  }
  private JsonNode first(JsonNode n,String... names){for(String name:names){JsonNode v=n.path(name);if(v.isObject())return v;}return n;}
  private Integer integer(JsonNode n,String... names){for(String name:names){JsonNode v=n.path(name);if(v.isNumber())return v.intValue();if(v.isTextual())try{return Integer.valueOf(v.asText());}catch(Exception ignored){}}return null;}
  private BigDecimal decimal(JsonNode n,String... names){for(String name:names){JsonNode v=n.path(name);if(v.isNumber())return v.decimalValue();if(v.isTextual())try{return new BigDecimal(v.asText().replace(",",""));}catch(Exception ignored){}}return null;}
  private boolean hasSummary(NormalizedCreditReport.Summary s){return s.totalAccounts()!=null||s.currentBalance()!=null||s.sanctionedAmount()!=null||s.creditHistoryMonths()!=null;}
  private NormalizedCreditReport.Summary summarize(List<NormalizedCreditReport.Tradeline> lines,JsonNode data){int open=0,closed=0,delinquent=0,written=0,max=0;BigDecimal balance=BigDecimal.ZERO,limit=BigDecimal.ZERO;for(var l:lines){if(l.accountStatus()!=null&&l.accountStatus().toLowerCase(Locale.ROOT).contains("closed"))closed++;else open++;if(l.overdueAmount()!=null&&l.overdueAmount().signum()>0)delinquent++;if(l.maximumDaysPastDue()!=null)max=Math.max(max,l.maximumDaysPastDue());if(l.currentBalance()!=null)balance=balance.add(l.currentBalance());if(l.sanctionedAmount()!=null)limit=limit.add(l.sanctionedAmount());if(l.writtenOffAmount()!=null&&l.writtenOffAmount().signum()>0)written++;}return new NormalizedCreditReport.Summary(lines.size(),open,closed,delinquent,null,null,balance,limit,historyMonths(lines),data.path("inquiries").isArray()?data.path("inquiries").size():null,max,written);}
  private Integer maxDpd(JsonNode n){int max=0;if(integer(n,"daysDel30")!=null&&integer(n,"daysDel30")>0)max=30;if(integer(n,"daysDel60")!=null&&integer(n,"daysDel60")>0)max=60;if(integer(n,"daysDel90")!=null&&integer(n,"daysDel90")>0)max=90;return max;}
  private Integer historyMonths(List<NormalizedCreditReport.Tradeline> lines){return lines.stream().map(NormalizedCreditReport.Tradeline::openedDate).filter(Objects::nonNull).mapToInt(v->{try{return Integer.parseInt(v);}catch(Exception e){return 0;}}).max().orElse(0);}
  private String mask(String v){return v==null?null:"****"+v.substring(Math.max(0,v.length()-4));}
}
