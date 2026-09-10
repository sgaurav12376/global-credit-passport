package com.synergyresources.gcp.passport.risk;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record RiskAssessment(
    String schemaVersion,
    String modelType,
    String modelVersion,
    String status,
    Integer riskIndex,
    String riskBand,
    Confidence confidence,
    List<Dimension> dimensions,
    List<String> missingDimensions,
    CalculationTrace calculationTrace,
    List<String> disclosures,
    Instant calculatedAt
) {
  public record Dimension(
      String key,
      String label,
      boolean available,
      Integer score,
      int configuredWeight,
      String band,
      List<String> reasonCodes
  ) {}

  public record Confidence(
      int score,
      String band,
      int coverageComponent,
      int completenessComponent,
      int freshnessComponent,
      int consistencyComponent,
      int identityAssuranceComponent,
      int analyticalAvailabilityComponent
  ) {}

  public record CalculationTrace(
      String aggregationMethod,
      int availableConfiguredWeight,
      int totalConfiguredWeight,
      String inputFingerprintSha256,
      List<EvidenceReference> evidence
  ) {}

  public record EvidenceReference(
      UUID evidenceId,
      String domain,
      String countryCode,
      String provider,
      String sourceSystem,
      String schemaVersion,
      String adapterId,
      String adapterVersion,
      int completenessPercent,
      Instant retrievedAt
  ) {}
}
