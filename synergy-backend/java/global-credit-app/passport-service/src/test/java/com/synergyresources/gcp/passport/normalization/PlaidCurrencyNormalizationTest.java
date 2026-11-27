package com.synergyresources.gcp.passport.normalization;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class PlaidCurrencyNormalizationTest {
 private final ObjectMapper mapper = new ObjectMapper();
 private final PlaidCashflowNormalizationAdapter adapter = new PlaidCashflowNormalizationAdapter();
 private final NormalizationContext context = new NormalizationContext("US", "PLAID", "OPEN_BANKING", "snapshot-test", "plaid-link-v1", null, Instant.EPOCH, null);
 private ObjectNode input() {
   ObjectNode n = mapper.createObjectNode();
   n.put("completeMonthsAnalyzed", 6); n.put("analyzedTransactions", 20);
   n.put("averageMonthlyDetectedIncome", 6000); n.put("averageMonthlyDebtPayments", 300);
   n.put("averageMonthlyOutflows", 2000); n.put("averageMonthlySustainableNetCashflow", 4000);
   n.put("incomeStabilityPercent", 95); n.putArray("monthlyCashflow"); return n;
 }
 @Test void propagatesConfirmedCurrencyWithoutClaimingProduction() {
   ObjectNode n = input().put("currencyCode", "USD"); var d = adapter.normalize(n, context);
   assertEquals("USD", d.currencyCode()); assertEquals(GcpNormalized.EvidenceEnvironment.UNKNOWN, d.evidenceEnvironment());
   assertEquals(6000, d.metrics().averageMonthlyIncome().intValueExact());
 }
 @Test void withholdsNewUnconfirmedCurrencyMetrics() {
   ObjectNode n = input().putNull("currencyCode"); var d = adapter.normalize(n, context);
   assertNull(d.currencyCode()); assertNull(d.metrics().averageMonthlyIncome()); assertNull(d.metrics().incomeStabilityPercent());
   assertTrue(n.has("averageMonthlyDetectedIncome"));
 }
 @Test void withholdsInsufficientHistory() {
   ObjectNode n = input().put("currencyCode", "USD").put("completeMonthsAnalyzed", 1); var d = adapter.normalize(n, context);
   assertNull(d.metrics().averageMonthlyIncome()); assertNull(d.metrics().averageMonthlyDebtPayments());
 }
}
