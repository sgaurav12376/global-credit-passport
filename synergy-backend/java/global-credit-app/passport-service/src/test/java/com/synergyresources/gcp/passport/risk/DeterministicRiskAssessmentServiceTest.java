package com.synergyresources.gcp.passport.risk;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.model.NormalizedEvidence;
import com.synergyresources.gcp.passport.normalization.CreditBureauReconciliationService;
import com.synergyresources.gcp.passport.normalization.EvidenceCoverageCalculator;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class DeterministicRiskAssessmentServiceTest {
  private final ObjectMapper mapper = new ObjectMapper();
  private final DeterministicRiskAssessmentService service =
      new DeterministicRiskAssessmentService();

  @Test
  void calculatesAvailableDimensionsAndKeepsConfidenceSeparate() throws Exception {
    NormalizedEvidence credit = evidence("CREDIT", 75, """
        {"nativeScore":{"value":700,"minimum":300,"maximum":900,"model":"CRIF"},
         "summary":{"maximumDaysPastDue":0,"overdueOrDefaultAccounts":0,
         "writtenOffAccounts":0,"currentBalance":1200,"sanctionedAmount":100000,
         "creditHistoryMonths":72}}
        """);
    NormalizedEvidence cashflow = evidence("CASHFLOW", 83, """
        {"metrics":{"averageMonthlyIncome":6000,"averageMonthlyDebtPayments":500,
         "averageMonthlyNetCashflow":1800,"incomeStabilityPercent":88}}
        """);
    NormalizedEvidence identity = evidence("IDENTITY", 100,
        "{\"status\":\"DECLINED\",\"verified\":false}");
    List<NormalizedEvidence> all = List.of(identity, credit, cashflow);
    var coverage = new EvidenceCoverageCalculator().calculate(all);
    var reconciliation = new CreditBureauReconciliationService().reconcile(all);

    RiskAssessment result = service.assess(all, coverage, reconciliation);

    assertEquals("CALCULATED", result.status());
    assertNotNull(result.riskIndex());
    assertEquals(6, result.dimensions().stream().filter(RiskAssessment.Dimension::available).count());
    assertTrue(result.confidence().score() < result.riskIndex());
    assertEquals(25, result.confidence().identityAssuranceComponent());
    assertEquals(100, result.confidence().analyticalAvailabilityComponent());
    assertEquals("WEIGHTED_MEAN_OF_AVAILABLE_DIMENSIONS",
        result.calculationTrace().aggregationMethod());
    assertEquals(100, result.calculationTrace().availableConfiguredWeight());
    assertEquals(3, result.calculationTrace().evidence().size());
    assertEquals(64, result.calculationTrace().inputFingerprintSha256().length());
  }

  @Test
  void doesNotCreateRiskIndexFromIdentityAlone() throws Exception {
    NormalizedEvidence identity = evidence("IDENTITY", 100,
        "{\"status\":\"APPROVED\",\"verified\":true}");
    var coverage = new EvidenceCoverageCalculator().calculate(List.of(identity));
    var reconciliation = new CreditBureauReconciliationService().reconcile(List.of(identity));

    RiskAssessment result = service.assess(List.of(identity), coverage, reconciliation);

    assertEquals("INSUFFICIENT_EVIDENCE", result.status());
    assertEquals(null, result.riskIndex());
  }

  @Test
  void unavailableDimensionsReduceConfidenceBand() throws Exception {
    NormalizedEvidence credit = evidence("CREDIT", 75, """
        {"summary":{"maximumDaysPastDue":0,"overdueOrDefaultAccounts":0,
         "writtenOffAccounts":0,"currentBalance":90000,"sanctionedAmount":100000,
         "creditHistoryMonths":18}}
        """);
    NormalizedEvidence cashflow = evidence("CASHFLOW", 50,
        "{\"metrics\":{\"completeMonthsAnalyzed\":5,\"averageMonthlyIncome\":0}}");
    NormalizedEvidence identity = evidence("IDENTITY", 100,
        "{\"status\":\"DECLINED\",\"verified\":false}");
    List<NormalizedEvidence> all = List.of(identity, credit, cashflow);

    RiskAssessment result = service.assess(
        all, new EvidenceCoverageCalculator().calculate(all),
        new CreditBureauReconciliationService().reconcile(all)
    );

    assertEquals(50, result.confidence().analyticalAvailabilityComponent());
    assertEquals("MEDIUM", result.confidence().band());
    assertEquals(50, result.calculationTrace().availableConfiguredWeight());
    assertEquals(100, result.calculationTrace().totalConfiguredWeight());
    assertEquals("POSITIVE_ANALYZED_INCOME_UNAVAILABLE", result.dimensions().stream()
        .filter(dimension -> "INCOME_STABILITY".equals(dimension.key()))
        .findFirst().orElseThrow().reasonCodes().get(0));
  }

  @Test
  void explainsWhenIncomeStabilityHasTooFewCompleteMonths() throws Exception {
    NormalizedEvidence cashflow = evidence("CASHFLOW", 50,
        "{\"metrics\":{\"completeMonthsAnalyzed\":1,\"averageMonthlyIncome\":6000}}");

    RiskAssessment result = service.assess(
        List.of(cashflow), new EvidenceCoverageCalculator().calculate(List.of(cashflow)),
        new CreditBureauReconciliationService().reconcile(List.of(cashflow))
    );

    assertEquals("INSUFFICIENT_COMPLETE_MONTHS_FOR_STABILITY", result.dimensions().stream()
        .filter(dimension -> "INCOME_STABILITY".equals(dimension.key()))
        .findFirst().orElseThrow().reasonCodes().get(0));
  }

  private NormalizedEvidence evidence(String domain, int completeness, String json) throws Exception {
    NormalizedEvidence value = new NormalizedEvidence();
    value.setDomain(domain);
    value.setCountryCode("IN");
    value.setProvider(domain.equals("CASHFLOW") ? "PLAID" : "SUREPASS");
    value.setSourceSystem(domain);
    value.setSchemaVersion("GCP_" + domain + "_V1");
    value.setAdapterId("TEST_" + domain);
    value.setAdapterVersion("1.0.0");
    value.setCompletenessPercent(completeness);
    value.setRetrievedAt(Instant.now());
    value.setPayload(mapper.readTree(json));
    return value;
  }
}
