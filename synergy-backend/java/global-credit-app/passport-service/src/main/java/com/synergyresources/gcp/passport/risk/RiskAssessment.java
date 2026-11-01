package com.synergyresources.gcp.passport.risk;

import java.math.BigDecimal;
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
    List<DimensionExplanation> dimensionExplanations,
    AssessmentEvidence assessmentEvidence,
    CrossBorderContext crossBorderContext,
    List<NativeScoreReference> nativeScoreReferences,
    List<Driver> keyDrivers,
    ReviewGuidance reviewGuidance,
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

  public record DimensionExplanation(
      String dimensionKey,
      String standardizedMetric,
      String observedValue,
      String unit,
      String sourceDomain,
      String sourceProvider,
      String sourceSystem,
      String sourceCountry,
      UUID evidenceId,
      String evidenceStatus,
      String scoringRule,
      Integer score,
      int configuredWeight,
      BigDecimal weightedContribution
  ) {}

  public record AssessmentEvidence(
      String provider,
      String sourceSystem,
      String countryCode,
      int completenessPercent,
      Instant retrievedAt,
      String selectionMethod,
      String explanation
  ) {}

  public record CrossBorderContext(
      List<String> evidenceCountries,
      boolean nativeScoreScalesPreserved,
      String currencyTreatment,
      String destinationPolicyTreatment,
      List<String> comparabilityNotes
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

  public record NativeScoreReference(
      String countryCode,
      String provider,
      String bureau,
      Integer nativeValue,
      Integer nativeMinimum,
      Integer nativeMaximum,
      Integer rangePositionPercent,
      String referenceBand,
      String model
  ) {}

  public record Driver(
      String dimensionKey,
      String label,
      String category,
      Integer score,
      List<String> reasonCodes
  ) {}

  public record ReviewGuidance(
      String reviewPriority,
      String assessmentBasis,
      List<String> dataGaps,
      List<String> recommendedActions,
      boolean lenderDecisionRequired
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
