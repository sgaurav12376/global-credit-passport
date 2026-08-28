package com.synergyresources.gcp.passport.surepass;

import java.math.BigDecimal;
import java.util.List;

public record NormalizedCreditReport(
    String bureau,
    String providerReference,
    Integer creditScore,
    Integer scoreMinimum,
    Integer scoreMaximum,
    List<String> scoreFactors,
    Summary summary,
    List<Tradeline> tradelines,
    List<String> dataQualityWarnings
) {
  public record Summary(
      Integer totalAccounts,
      Integer activeAccounts,
      Integer closedAccounts,
      Integer overdueOrDefaultAccounts,
      Integer securedAccounts,
      Integer unsecuredAccounts,
      BigDecimal currentBalance,
      BigDecimal sanctionedAmount,
      Integer creditHistoryMonths,
      Integer recentEnquiries,
      Integer maximumDaysPastDue,
      Integer writtenOffAccounts
  ) {
  }

  public record Tradeline(
      String maskedAccountNumber,
      String accountType,
      String accountStatus,
      BigDecimal currentBalance,
      BigDecimal sanctionedAmount,
      BigDecimal overdueAmount,
      BigDecimal writtenOffAmount,
      Integer maximumDaysPastDue,
      String openedDate,
      String reportedDate
  ) {
  }
}
