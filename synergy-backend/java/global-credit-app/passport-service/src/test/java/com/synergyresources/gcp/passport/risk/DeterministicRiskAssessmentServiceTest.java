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
         "creditHistoryMonths":72,"recentEnquiries":2}}
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
    assertEquals("GCP_RISK_ASSESSMENT_V6", result.schemaVersion());
    assertEquals("GCP_RULES_V1_6", result.modelVersion());
    assertEquals(7, result.dimensions().stream().filter(RiskAssessment.Dimension::available).count());
    assertTrue(result.confidence().score() < result.riskIndex());
    assertEquals(25, result.confidence().identityAssuranceComponent());
    assertEquals(100, result.confidence().analyticalAvailabilityComponent());
    assertEquals("WEIGHTED_MEAN_OF_AVAILABLE_DIMENSIONS",
        result.calculationTrace().aggregationMethod());
    assertEquals(100, result.calculationTrace().availableConfiguredWeight());
    assertEquals(3, result.calculationTrace().evidence().size());
    assertEquals(64, result.calculationTrace().inputFingerprintSha256().length());
    assertEquals(67, result.nativeScoreReferences().get(0).rangePositionPercent());
    assertEquals("STANDARD_REVIEW", result.reviewGuidance().reviewPriority());
    assertEquals("CREDIT_AND_CASHFLOW", result.reviewGuidance().assessmentBasis());
    assertTrue(result.reviewGuidance().lenderDecisionRequired());
    assertTrue(result.keyDrivers().stream().anyMatch(
        driver -> "RECENT_CREDIT_ENQUIRIES".equals(driver.dimensionKey())
    ));
    assertEquals(7, result.dimensionExplanations().size());
    assertEquals("1.2", result.dimensionExplanations().stream()
        .filter(item -> "CREDIT_UTILIZATION".equals(item.dimensionKey()))
        .findFirst().orElseThrow().observedValue());
    assertTrue(result.crossBorderContext().nativeScoreScalesPreserved());
    assertTrue(result.crossBorderContext().evidenceCountries().contains("IN"));
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

    assertEquals(47, result.confidence().analyticalAvailabilityComponent());
    assertEquals("MEDIUM", result.confidence().band());
    assertEquals(47, result.calculationTrace().availableConfiguredWeight());
    assertEquals(100, result.calculationTrace().totalConfiguredWeight());
    assertEquals("POSITIVE_ANALYZED_INCOME_UNAVAILABLE", result.dimensions().stream()
        .filter(dimension -> "INCOME_STABILITY".equals(dimension.key()))
        .findFirst().orElseThrow().reasonCodes().get(0));
  }

  @Test
  void capsConfidenceWhenAnalyticalAvailabilityOrIdentityAssuranceIsLimited() throws Exception {
    NormalizedEvidence credit = evidence("CREDIT", 100, """
        {"summary":{"maximumDaysPastDue":0,"overdueOrDefaultAccounts":0,
         "writtenOffAccounts":0,"currentBalance":20000,"sanctionedAmount":200000,
         "creditHistoryMonths":120,"recentEnquiries":1}}
        """);
    NormalizedEvidence cashflow = evidence("CASHFLOW", 83,
        "{\"metrics\":{\"completeMonthsAnalyzed\":5,\"averageMonthlyIncome\":0}}");
    NormalizedEvidence identity = evidence("IDENTITY", 100,
        "{\"status\":\"DECLINED\",\"verified\":false}");
    List<NormalizedEvidence> all = List.of(identity, credit, cashflow);

    RiskAssessment result = service.assess(
        all, new EvidenceCoverageCalculator().calculate(all),
        new CreditBureauReconciliationService().reconcile(all)
    );

    assertEquals(96, result.riskIndex());
    assertEquals(55, result.confidence().analyticalAvailabilityComponent());
    assertEquals(25, result.confidence().identityAssuranceComponent());
    assertEquals(69, result.confidence().score());
    assertEquals("MEDIUM", result.confidence().band());
  }

  @Test
  void scoresRecentCreditSeekingWithoutTreatingItAsADeclineDecision() throws Exception {
    NormalizedEvidence credit = evidence("CREDIT", 75, """
        {"summary":{"maximumDaysPastDue":0,"overdueOrDefaultAccounts":0,
         "writtenOffAccounts":0,"recentEnquiries":8,"creditHistoryMonths":48}}
        """);
    List<NormalizedEvidence> all = List.of(credit);

    RiskAssessment result = service.assess(
        all, new EvidenceCoverageCalculator().calculate(all),
        new CreditBureauReconciliationService().reconcile(all)
    );

    RiskAssessment.Dimension enquiries = result.dimensions().stream()
        .filter(item -> "RECENT_CREDIT_ENQUIRIES".equals(item.key()))
        .findFirst().orElseThrow();
    assertEquals(30, enquiries.score());
    assertEquals("RECENT_ENQUIRIES_8", enquiries.reasonCodes().get(0));
    assertTrue(result.reviewGuidance().lenderDecisionRequired());
  }

  @Test
  void identifiesDataGapsAndRecommendsAdditionalEvidence() throws Exception {
    NormalizedEvidence identity = evidence("IDENTITY", 100,
        "{\"status\":\"APPROVED\",\"verified\":true}");
    List<NormalizedEvidence> all = List.of(identity);

    RiskAssessment result = service.assess(
        all, new EvidenceCoverageCalculator().calculate(all),
        new CreditBureauReconciliationService().reconcile(all)
    );

    assertEquals("DATA_REQUIRED", result.reviewGuidance().reviewPriority());
    assertEquals("LIMITED_EVIDENCE", result.reviewGuidance().assessmentBasis());
    assertTrue(result.reviewGuidance().recommendedActions()
        .contains("REQUEST_VERIFIED_CREDIT_EVIDENCE"));
    assertTrue(result.reviewGuidance().recommendedActions()
        .contains("REQUEST_CONSENTED_CASHFLOW_EVIDENCE"));
    assertEquals(7, result.reviewGuidance().dataGaps().size());
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

  @Test
  void selectsCompleteCibilRecordDeterministicallyAndExposesFactorSource() throws Exception {
    NormalizedEvidence equifax = evidence("CREDIT", 100, """
        {"summary":{"maximumDaysPastDue":0,"overdueOrDefaultAccounts":0,
        "writtenOffAccounts":0,"currentBalance":35000,"sanctionedAmount":200000,
        "creditHistoryMonths":96,"recentEnquiries":1}}
        """);
    equifax.setSourceSystem("EQUIFAX");
    NormalizedEvidence cibil = evidence("CREDIT", 100, """
        {"summary":{"maximumDaysPastDue":0,"overdueOrDefaultAccounts":0,
        "writtenOffAccounts":0,"currentBalance":34000,"sanctionedAmount":200000,
        "creditHistoryMonths":96,"recentEnquiries":2}}
        """);
    cibil.setSourceSystem("CIBIL");
    List<NormalizedEvidence> all = List.of(equifax, cibil);

    RiskAssessment result = service.assess(
        all, new EvidenceCoverageCalculator().calculate(all),
        new CreditBureauReconciliationService().reconcile(all)
    );

    assertEquals("CIBIL", result.assessmentEvidence().sourceSystem());
    assertEquals("CIBIL", result.dimensionExplanations().stream()
        .filter(item -> "CREDIT_UTILIZATION".equals(item.dimensionKey()))
        .findFirst().orElseThrow().sourceSystem());
    assertEquals("17.0", result.dimensionExplanations().stream()
        .filter(item -> "CREDIT_UTILIZATION".equals(item.dimensionKey()))
        .findFirst().orElseThrow().observedValue());
  }

  @Test
  void capsConfidenceWhenSelectedAssessmentEvidenceIsSynthetic() throws Exception {
    NormalizedEvidence credit = evidence("CREDIT", 100, """
        {"summary":{"maximumDaysPastDue":0,"overdueOrDefaultAccounts":0,
        "writtenOffAccounts":0,"currentBalance":34000,"sanctionedAmount":200000,
        "creditHistoryMonths":96,"recentEnquiries":2}}
        """);
    credit.setProvider("GCP_SIMULATOR");
    credit.setSourceSystem("CIBIL_SIMULATED");
    NormalizedEvidence cashflow = evidence("CASHFLOW", 100, """
        {"metrics":{"averageMonthlyIncome":6000,"averageMonthlyDebtPayments":500,
        "averageMonthlyNetCashflow":1800,"incomeStabilityPercent":100}}
        """);
    NormalizedEvidence identity = evidence("IDENTITY", 100,
        "{\"status\":\"APPROVED\",\"verified\":true}");
    List<NormalizedEvidence> all = List.of(identity, credit, cashflow);

    RiskAssessment result = service.assess(
        all, new EvidenceCoverageCalculator().calculate(all),
        new CreditBureauReconciliationService().reconcile(all)
    );

    assertEquals(69, result.confidence().score());
    assertEquals("MEDIUM", result.confidence().band());
  }

  @Test
  void prefersProviderCreditEvidenceOverSyntheticCreditEvidence() throws Exception {
    NormalizedEvidence synthetic = evidence("CREDIT", 100, """
        {"summary":{"maximumDaysPastDue":0,"overdueOrDefaultAccounts":0,
        "writtenOffAccounts":0,"currentBalance":10000,"sanctionedAmount":100000,
        "creditHistoryMonths":120,"recentEnquiries":1}}
        """);
    synthetic.setProvider("GCP_SIMULATOR");
    synthetic.setSourceSystem("CIBIL_SIMULATED");
    NormalizedEvidence provider = evidence("CREDIT", 90, """
        {"summary":{"maximumDaysPastDue":0,"overdueOrDefaultAccounts":0,
        "writtenOffAccounts":0,"currentBalance":30000,"sanctionedAmount":100000,
        "creditHistoryMonths":72,"recentEnquiries":2}}
        """);
    provider.setProvider("FINPASS");
    provider.setSourceSystem("EQUIFAX");
    List<NormalizedEvidence> all = List.of(synthetic, provider);

    RiskAssessment result = service.assess(
        all, new EvidenceCoverageCalculator().calculate(all),
        new CreditBureauReconciliationService().reconcile(all)
    );

    assertEquals("EQUIFAX", result.assessmentEvidence().sourceSystem());
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
