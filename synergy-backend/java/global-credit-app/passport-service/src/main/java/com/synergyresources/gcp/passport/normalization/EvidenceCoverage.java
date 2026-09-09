package com.synergyresources.gcp.passport.normalization;

import java.util.List;
import java.util.Map;

public record EvidenceCoverage(
    String schemaVersion,
    int coveragePercent,
    int evidenceCount,
    int providerCount,
    Map<String, DomainCoverage> domains,
    List<String> missingDomains,
    boolean sufficientForRiskAssessment
) {
  public record DomainCoverage(
      boolean available, int evidenceCount, int bestCompletenessPercent, int weightedContribution
  ) {}
}
