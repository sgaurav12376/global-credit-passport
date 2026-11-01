package com.synergyresources.gcp.passport.normalization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.synergyresources.gcp.passport.model.NormalizedEvidence;
import java.util.List;
import org.junit.jupiter.api.Test;

class EvidenceCoverageCalculatorTest {
  private final EvidenceCoverageCalculator calculator = new EvidenceCoverageCalculator();

  @Test
  void calculatesPartialCoverageWithoutRequiringEverySource() {
    NormalizedEvidence credit = evidence("CREDIT", "IN", "SUREPASS", "EQUIFAX", 80);
    NormalizedEvidence cashflow = evidence("CASHFLOW", "US", "PLAID", "OPEN_BANKING", 100);

    EvidenceCoverage result = calculator.calculate(List.of(credit, cashflow));

    assertEquals(71, result.coveragePercent());
    assertEquals(2, result.providerCount());
    assertEquals(List.of("IDENTITY"), result.missingDomains());
    assertTrue(result.sufficientForRiskAssessment());
  }

  @Test
  void identityAloneDoesNotQualifyAsRiskEvidence() {
    EvidenceCoverage result = calculator.calculate(
        List.of(evidence("IDENTITY", "US", "ENTRUST", "IDV", 100))
    );

    assertEquals(20, result.coveragePercent());
    assertFalse(result.sufficientForRiskAssessment());
  }

  @Test
  void multipleBureausIncreaseEvidenceCountButDoNotDoubleCountDomainWeight() {
    EvidenceCoverage result = calculator.calculate(List.of(
        evidence("CREDIT", "IN", "SUREPASS", "EQUIFAX", 80),
        evidence("CREDIT", "IN", "SUREPASS", "EXPERIAN", 60)
    ));

    assertEquals(36, result.coveragePercent());
    assertEquals(2, result.domains().get("CREDIT").evidenceCount());
    assertEquals(1, result.providerCount());
  }

  private NormalizedEvidence evidence(
      String domain, String country, String provider, String source, int completeness
  ) {
    NormalizedEvidence value = new NormalizedEvidence();
    value.setDomain(domain);
    value.setCountryCode(country);
    value.setProvider(provider);
    value.setSourceSystem(source);
    value.setCompletenessPercent(completeness);
    return value;
  }
}
