package com.synergyresources.gcp.passport.normalization;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class PlaidCashflowNormalizationAdapter
    implements NormalizationAdapter<JsonNode, GcpNormalized.CashflowDataset> {
  public String adapterId() { return "plaid-cashflow"; }
  public String adapterVersion() { return "1.0.0"; }

  public GcpNormalized.CashflowDataset normalize(JsonNode source, NormalizationContext context) {
    List<String> fields = new ArrayList<>();
    add(fields, source, "analyzedTransactions");
    add(fields, source, "coverageStart");
    add(fields, source, "coverageEnd");
    add(fields, source, "averageMonthlyDetectedIncome");
    add(fields, source, "averageMonthlyOutflows");
    add(fields, source, "incomeStabilityPercent");
    int completeness = Math.min(100, Math.round(fields.size() * 100f / 6f));
    List<String> warnings = new ArrayList<>();
    if (integer(source, "completeMonthsAnalyzed") == null
        || integer(source, "completeMonthsAnalyzed") < 2) {
      warnings.add("Fewer than two complete months of cash-flow history are available");
    }
    return new GcpNormalized.CashflowDataset(
        "GCP_CASHFLOW_V1",
        new GcpNormalized.Provenance(
            context.countryCode(), context.provider(), context.sourceSystem(),
            context.providerReference(), context.consentVersion(), context.consentedAt(),
            context.retrievedAt(), context.documentSha256(), adapterId(), adapterVersion()
        ),
        new GcpNormalized.CashflowMetrics(
            integer(source, "institutionConnections"), integer(source, "depositoryAccounts"),
            integer(source, "analyzedTransactions"), date(source, "coverageStart"),
            date(source, "coverageEnd"), integer(source, "completeMonthsAnalyzed"),
            decimal(source, "averageMonthlyDetectedIncome"),
            decimal(source, "averageMonthlyOutflows"),
            decimal(source, "averageMonthlyDebtPayments"),
            decimal(source, "averageMonthlySustainableNetCashflow"),
            decimal(source, "incomeStabilityPercent")
        ),
        source.path("monthlyCashflow"),
        new GcpNormalized.DataQuality(completeness, List.copyOf(fields), List.copyOf(warnings))
    );
  }

  private void add(List<String> fields, JsonNode source, String field) {
    if (!source.path(field).isMissingNode() && !source.path(field).isNull()) fields.add(field);
  }
  private Integer integer(JsonNode node, String field) {
    return node.path(field).isNumber() ? node.path(field).intValue() : null;
  }
  private BigDecimal decimal(JsonNode node, String field) {
    return node.path(field).isNumber() ? node.path(field).decimalValue() : null;
  }
  private LocalDate date(JsonNode node, String field) {
    try { return LocalDate.parse(node.path(field).asText()); }
    catch (RuntimeException ignored) { return null; }
  }
}
