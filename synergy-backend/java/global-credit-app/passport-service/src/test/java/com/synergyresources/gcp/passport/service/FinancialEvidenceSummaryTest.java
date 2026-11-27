package com.synergyresources.gcp.passport.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class FinancialEvidenceSummaryTest {
  private final ObjectMapper json = new ObjectMapper();

  private ObjectNode fixture() throws Exception {
    return (ObjectNode) json.readTree("""
      {"normalizedEvidence":[{"domain":"CASHFLOW","provider":"PLAID","sourceSystem":"OPEN_BANKING","countryCode":"US",
        "dataset":{"currencyCode":"USD","evidenceEnvironment":"SANDBOX",
          "provenance":{"countryCode":"US","provider":"PLAID","sourceSystem":"OPEN_BANKING","providerReference":"private-reference"},
          "metrics":{"completeMonthsAnalyzed":3,"coverageStart":"2026-01-01","coverageEnd":"2026-03-31",
            "averageMonthlyIncome":7500,"averageMonthlyDebtPayments":1200,"averageMonthlyNetCashflow":2100,"incomeStabilityPercent":95,
            "accountId":"private-account"},"monthlyCashflow":[{"raw":"private-data"}]}}]}
      """);
  }
  private ObjectNode item(ObjectNode doc) { return (ObjectNode) doc.path("normalizedEvidence").get(0); }
  private ObjectNode dataset(ObjectNode doc) { return (ObjectNode) item(doc).path("dataset"); }
  private ObjectNode metrics(ObjectNode doc) { return (ObjectNode) dataset(doc).path("metrics"); }

  @Test void exposesOnlyAllowedAggregates() throws Exception {
    var result = FinancialEvidenceSummary.from(json, fixture());
    assertEquals(1, result.size());
    var row = result.get(0);
    assertEquals("USD", row.path("currencyCode").asText());
    assertEquals(16.0, row.path("metrics").path("debtToIncomePercent").asDouble());
    assertEquals(28.0, row.path("metrics").path("netCashflowToIncomePercent").asDouble());
    assertFalse(result.toString().contains("private-"));
    assertFalse(row.has("monthlyCashflow"));
    assertFalse(row.has("provenance"));
  }
  @Test void missingCurrencySuppressesAmountsAndRatios() throws Exception {
    var doc = fixture(); dataset(doc).remove("currencyCode");
    var row = FinancialEvidenceSummary.from(json, doc).get(0);
    assertTrue(row.path("currencyCode").isNull());
    assertFalse(row.path("metrics").has("averageMonthlyIncome"));
    assertFalse(row.path("metrics").has("debtToIncomePercent"));
    assertEquals(3, row.path("metrics").path("completeMonthsAnalyzed").asInt());
  }
  @Test void excludesSyntheticEnvironment() throws Exception {
    var doc = fixture(); dataset(doc).put("evidenceEnvironment", "SYNTHETIC");
    assertEquals(0, FinancialEvidenceSummary.from(json, doc).size());
  }
  @Test void excludesSetuUntilPublicationAuthorized() throws Exception {
    var doc = fixture(); item(doc).put("provider", "SETU");
    assertEquals(0, FinancialEvidenceSummary.from(json, doc).size());
  }
  @Test void rejectsMismatchedProvenance() throws Exception {
    var doc = fixture(); ((ObjectNode) dataset(doc).path("provenance")).put("countryCode", "IN");
    assertEquals(0, FinancialEvidenceSummary.from(json, doc).size());
  }
  @Test void historicalReportWithoutEvidenceRemainsReadable() {
    assertEquals(0, FinancialEvidenceSummary.from(json, json.createObjectNode()).size());
  }
  @Test void legacySandboxFlagOverridesUnknown() throws Exception {
    var doc = fixture(); dataset(doc).remove("evidenceEnvironment");
    doc.putObject("evidenceEnvironment").put("openBankingSandbox", true);
    assertEquals("SANDBOX", FinancialEvidenceSummary.from(json, doc).get(0).path("evidenceEnvironment").asText());
  }
  @Test void incompleteMonthsSuppressAmounts() throws Exception {
    var doc = fixture(); metrics(doc).put("completeMonthsAnalyzed", 1);
    assertFalse(FinancialEvidenceSummary.from(json, doc).get(0).path("metrics").has("averageMonthlyIncome"));
  }
  @Test void missingDebtDoesNotBecomeZero() throws Exception {
    var doc = fixture(); metrics(doc).remove("averageMonthlyDebtPayments");
    assertFalse(FinancialEvidenceSummary.from(json, doc).get(0).path("metrics").has("debtToIncomePercent"));
  }
}
