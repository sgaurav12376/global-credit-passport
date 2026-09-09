package com.synergyresources.gcp.passport.risk;

import java.time.Instant;
import java.util.List;

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
      int identityAssuranceComponent
  ) {}
}
