package com.synergyresources.gcp.passport.normalization;

import com.fasterxml.jackson.databind.JsonNode;
import com.synergyresources.gcp.passport.surepass.NormalizedCreditReport;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class GcpNormalized {
  private GcpNormalized() {}

  public record Provenance(
      String countryCode, String provider, String sourceSystem,
      String providerReference, String consentVersion, Instant consentedAt,
      Instant retrievedAt, String documentSha256,
      String adapterId, String adapterVersion
  ) {}

  public record DataQuality(
      int completenessPercent,
      List<String> availableFields,
      List<String> warnings
  ) {}

  public record NativeScore(Integer value, Integer minimum, Integer maximum, String model) {}

  public record CreditDataset(
      String schemaVersion,
      Provenance provenance,
      NativeScore nativeScore,
      NormalizedCreditReport.Summary summary,
      List<NormalizedCreditReport.Tradeline> accounts,
      List<String> scoreFactors,
      DataQuality dataQuality
  ) {}

  public record CashflowMetrics(
      Integer institutionConnections,
      Integer depositoryAccounts,
      Integer analyzedTransactions,
      LocalDate coverageStart,
      LocalDate coverageEnd,
      Integer completeMonthsAnalyzed,
      BigDecimal averageMonthlyIncome,
      BigDecimal averageMonthlyOutflows,
      BigDecimal averageMonthlyDebtPayments,
      BigDecimal averageMonthlyNetCashflow,
      BigDecimal incomeStabilityPercent
  ) {}

  public record CashflowDataset(
      String schemaVersion,
      Provenance provenance,
      CashflowMetrics metrics,
      JsonNode monthlyCashflow,
      DataQuality dataQuality
  ) {}

  public record IdentityDataset(
      String schemaVersion,
      Provenance provenance,
      String status,
      boolean verified,
      String workflowReference,
      Instant startedAt,
      Instant completedAt,
      DataQuality dataQuality
  ) {}
}
