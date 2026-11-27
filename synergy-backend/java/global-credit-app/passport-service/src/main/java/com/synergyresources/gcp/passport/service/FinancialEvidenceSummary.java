package com.synergyresources.gcp.passport.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;
import java.time.LocalDate;

/** Explicit allowlist for aggregate cashflow presentation, not a scoring input. */
final class FinancialEvidenceSummary {
  private FinancialEvidenceSummary() {}

  static ArrayNode from(ObjectMapper mapper, JsonNode document) {
    ArrayNode result = mapper.createArrayNode();
    JsonNode evidence = document.path("normalizedEvidence");
    if (!evidence.isArray()) return result;
    for (JsonNode item : evidence) {
      if (!"CASHFLOW".equals(item.path("domain").asText())) continue;
      // Only the existing Plaid publication path is authorized in this milestone.
      if (!"PLAID".equals(item.path("provider").asText())
          || !"OPEN_BANKING".equals(item.path("sourceSystem").asText())) continue;
      JsonNode dataset = item.path("dataset");
      JsonNode provenance = dataset.path("provenance");
      String environment = dataset.path("evidenceEnvironment").asText("UNKNOWN");
      if (!java.util.Set.of("UNKNOWN", "SANDBOX", "PRODUCTION").contains(environment)) continue;
      if (!"PLAID".equals(provenance.path("provider").asText())
          || !"OPEN_BANKING".equals(provenance.path("sourceSystem").asText())) continue;
      String country = item.path("countryCode").asText();
      if (!country.matches("[A-Z]{2}") || !country.equals(provenance.path("countryCode").asText())) continue;
      JsonNode metrics = dataset.path("metrics");
      if (!metrics.isObject()) continue;
      ObjectNode row = result.addObject();
      row.put("countryCode", country);
      row.put("provider", "PLAID");
      row.put("sourceSystem", "OPEN_BANKING");
      // Report-level sandbox indicator is authoritative for the legacy Plaid path.
      if (document.path("evidenceEnvironment").path("openBankingSandbox").asBoolean(false)
          || document.path("coverage").path("openBankingSandbox").asBoolean(false)) environment = "SANDBOX";
      row.put("evidenceEnvironment", environment);
      String currency = currency(dataset.path("currencyCode"));
      if (currency == null) row.putNull("currencyCode"); else row.put("currencyCode", currency);
      ObjectNode summary = row.putObject("metrics");
      for (String field : new String[]{"institutionConnections", "depositoryAccounts", "analyzedTransactions", "completeMonthsAnalyzed"}) {
        JsonNode value = metrics.path(field);
        if (value.isIntegralNumber() && value.canConvertToInt() && value.intValue() >= 0) summary.put(field, value.intValue());
      }
      for (String field : new String[]{"coverageStart", "coverageEnd"}) {
        try { summary.put(field, LocalDate.parse(metrics.path(field).asText()).toString()); }
        catch (RuntimeException ignored) { /* Unavailable or invalid date. */ }
      }
      // Do not present monetary amounts or derived ratios without validated currency metadata.
      if (currency != null && summary.path("completeMonthsAnalyzed").asInt(0) >= 2) {
        for (String field : new String[]{"averageMonthlyIncome", "averageMonthlyOutflows", "averageMonthlyDebtPayments", "averageMonthlyNetCashflow", "incomeStabilityPercent"}) {
          JsonNode value = metrics.path(field);
          if (value.isNumber()) {
            BigDecimal number = value.decimalValue();
            if ((!"averageMonthlyNetCashflow".equals(field) && number.signum() < 0)
                || ("incomeStabilityPercent".equals(field) && number.compareTo(BigDecimal.valueOf(100)) > 0)) continue;
            summary.put(field, number);
          }
        }
        ratio(summary, "averageMonthlyDebtPayments", "debtToIncomePercent");
        ratio(summary, "averageMonthlyNetCashflow", "netCashflowToIncomePercent");
      }
    }
    return result;
  }

  private static String currency(JsonNode node) {
    if (!node.isTextual()) return null;
    try {
      Currency value = Currency.getInstance(node.asText());
      return value.getDefaultFractionDigits() >= 0 ? value.getCurrencyCode() : null;
    } catch (IllegalArgumentException ignored) { return null; }
  }

  private static void ratio(ObjectNode summary, String numerator, String target) {
    JsonNode income = summary.path("averageMonthlyIncome");
    JsonNode amount = summary.path(numerator);
    if (income.isNumber() && income.decimalValue().signum() > 0 && amount.isNumber()) {
      summary.put(target, amount.decimalValue().multiply(BigDecimal.valueOf(100))
          .divide(income.decimalValue(), 1, RoundingMode.HALF_UP));
    }
  }
}
