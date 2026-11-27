package com.synergyresources.gcp.passport.risk;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.model.NormalizedEvidence;
import com.synergyresources.gcp.passport.normalization.*;
import com.synergyresources.gcp.passport.setu.SetuFinancialSummaryCalculator;
import static com.synergyresources.gcp.passport.setu.SetuFinancialSummaryCalculator.Category.*;
import static com.synergyresources.gcp.passport.setu.SetuFinancialSummaryCalculator.Direction.*;
import static org.junit.jupiter.api.Assertions.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class CrossBorderCashflowTest {
  private final ObjectMapper json = new ObjectMapper().findAndRegisterModules();
  private final Instant retrieved = Instant.parse("2026-03-01T00:00:00Z");
  private final LocalDate from = LocalDate.parse("2026-01-01");
  private final LocalDate to = LocalDate.parse("2026-02-28");
  private final Set<YearMonth> months = Set.of(YearMonth.of(2026,1), YearMonth.of(2026,2));

  private SetuFinancialSummaryCalculator.Transaction tx(String id, String date, String amount,
      SetuFinancialSummaryCalculator.Direction direction, SetuFinancialSummaryCalculator.Category category) {
    return new SetuFinancialSummaryCalculator.Transaction("fixture-bank", "fixture-account", id,
        LocalDate.parse(date), "INR", direction, new BigDecimal(amount), category);
  }

  private NormalizedEvidence india(boolean complete) {
    var rows = List.of(tx("1","2026-01-05","120000",CREDIT,INCOME),
        tx("2","2026-01-12","55000",DEBIT,EXPENSE), tx("3","2026-01-20","25000",DEBIT,DEBT_PAYMENT),
        tx("4","2026-02-05","130000",CREDIT,INCOME), tx("5","2026-02-12","65000",DEBIT,EXPENSE),
        tx("6","2026-02-20","25000",DEBIT,DEBT_PAYMENT));
    var summary = new SetuFinancialSummaryCalculator().calculate(rows, from, to,
        complete ? months : Set.of(YearMonth.of(2026,1)));
    var context = new NormalizationContext("IN", "GCP_SIMULATOR", "SETU_CASHFLOW_FIXTURE",
        "setu-fixture-001", "gcp-local-fixture-v1", null, retrieved, null);
    return evidence(new SetuCashflowNormalizationAdapter(json).normalize(summary, context));
  }

  private NormalizedEvidence us(boolean debtAvailable, boolean synthetic) {
    var source = json.createObjectNode();
    source.put("analyzedTransactions", 30);
    source.put("coverageStart", "2026-01-01");
    source.put("coverageEnd", "2026-02-28");
    source.put("completeMonthsAnalyzed", 2);
    source.put("averageMonthlyDetectedIncome", 7500);
    source.put("averageMonthlyOutflows", 5400);
    if (debtAvailable) source.put("averageMonthlyDebtPayments", 1200);
    source.put("averageMonthlySustainableNetCashflow", 2100);
    source.put("incomeStabilityPercent", 95);
    source.putArray("monthlyCashflow");
    // Both inputs are fictional. The non-synthetic marker is used only to test
    // the existing comparator's provider-preference branch, never persisted.
    var context = new NormalizationContext("US", "PLAID", "OPEN_BANKING",
        synthetic ? "plaid-fixture-001" : "test-provider-reference", "test-only", null, retrieved, null);
    var legacy = new PlaidCashflowNormalizationAdapter().normalize(source, context);
    return evidence(new GcpNormalized.CashflowDataset(legacy.schemaVersion(), legacy.provenance(),
        legacy.metrics(), legacy.monthlyCashflow(), legacy.dataQuality(), "USD",
        synthetic ? GcpNormalized.EvidenceEnvironment.SYNTHETIC : GcpNormalized.EvidenceEnvironment.UNKNOWN));
  }

  private NormalizedEvidence evidence(GcpNormalized.CashflowDataset dataset) {
    var e = new NormalizedEvidence();
    var p = dataset.provenance();
    e.setDomain("CASHFLOW"); e.setCountryCode(p.countryCode()); e.setProvider(p.provider());
    e.setSourceSystem(p.sourceSystem()); e.setProviderReference(p.providerReference());
    e.setSchemaVersion(dataset.schemaVersion()); e.setAdapterId(p.adapterId());
    e.setAdapterVersion(p.adapterVersion()); e.setCompletenessPercent(dataset.dataQuality().completenessPercent());
    e.setRetrievedAt(p.retrievedAt()); e.setPayload(json.valueToTree(dataset));
    return e;
  }

  private RiskAssessment assess(NormalizedEvidence... records) {
    var all = List.of(records);
    return new DeterministicRiskAssessmentService().assess(all,
        new EvidenceCoverageCalculator().calculate(all),
        new CreditBureauReconciliationService().reconcile(all,"IN"), "IN", "US");
  }

  private RiskAssessment.DimensionExplanation factor(RiskAssessment r, String key) {
    return r.dimensionExplanations().stream().filter(x -> key.equals(x.dimensionKey())).findFirst().orElseThrow();
  }

  @Test void indiaOnlyUsesInrRatiosAndSyntheticProvenance() {
    var r = assess(india(true));
    var debt = factor(r,"DEBT_BURDEN");
    assertEquals("20.0",debt.observedValue()); assertEquals("IN",debt.sourceCountry());
    assertEquals("SOURCE_FALLBACK",debt.evidenceRole()); assertEquals("SYNTHETIC",debt.evidenceStatus());
    assertEquals("32.0",factor(r,"CASHFLOW_CAPACITY").observedValue());
    assertEquals(96,factor(r,"INCOME_STABILITY").score());
  }

  @Test void usOnlyUsesUsdRatios() {
    var r = assess(us(true,true));
    assertEquals("16.0",factor(r,"DEBT_BURDEN").observedValue());
    assertEquals("28.0",factor(r,"CASHFLOW_CAPACITY").observedValue());
    assertEquals("US",factor(r,"DEBT_BURDEN").sourceCountry());
  }

  @Test void bothSyntheticSourcesPreferDestinationRegardlessOfInputOrder() {
    var in = india(true); var us = us(true,true);
    for (var r : List.of(assess(in,us),assess(us,in))) {
      assertEquals("US",factor(r,"DEBT_BURDEN").sourceCountry());
      assertEquals("16.0",factor(r,"DEBT_BURDEN").observedValue());
      assertEquals("28.0",factor(r,"CASHFLOW_CAPACITY").observedValue());
      assertEquals("DESTINATION_PRIMARY",factor(r,"INCOME_STABILITY").evidenceRole());
      assertTrue(r.reviewGuidance().recommendedActions().contains("REVIEW_CONTINUING_SOURCE_COUNTRY_OBLIGATIONS_SEPARATELY"));
    }
  }

  @Test void missingDestinationDebtFallsBackWithoutMixingCurrencies() {
    var r = assess(india(true),us(false,true));
    assertEquals("IN",factor(r,"DEBT_BURDEN").sourceCountry());
    assertEquals("20.0",factor(r,"DEBT_BURDEN").observedValue());
    assertEquals("US",factor(r,"CASHFLOW_CAPACITY").sourceCountry());
    assertEquals("28.0",factor(r,"CASHFLOW_CAPACITY").observedValue());
  }

  @Test void incompleteIndiaHistoryDoesNotProduceScores() {
    var r = assess(india(false));
    for (String key : List.of("DEBT_BURDEN","CASHFLOW_CAPACITY","INCOME_STABILITY")) {
      assertNull(factor(r,key).score());
      assertNull(factor(r,key).observedValue());
    }
  }

  @Test void providerMarkedDestinationRemainsPreferred() {
    var r = assess(india(true),us(true,false));
    assertEquals("US",factor(r,"DEBT_BURDEN").sourceCountry());
    assertEquals("NORMALIZED_PROVIDER_EVIDENCE",factor(r,"DEBT_BURDEN").evidenceStatus());
  }

  @Test void evidenceCoverageDoesNotDoubleCountCashflowDomain() {
    var in = india(true); var us = us(true,true);
    var calculator = new EvidenceCoverageCalculator();
    assertEquals(calculator.calculate(List.of(in)).domains().get("CASHFLOW").weightedContribution(),
        calculator.calculate(List.of(in,us)).domains().get("CASHFLOW").weightedContribution());
  }
}
