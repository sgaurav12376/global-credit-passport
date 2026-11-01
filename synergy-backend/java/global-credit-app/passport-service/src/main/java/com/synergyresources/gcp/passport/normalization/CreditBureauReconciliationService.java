package com.synergyresources.gcp.passport.normalization;

import com.fasterxml.jackson.databind.JsonNode;
import com.synergyresources.gcp.passport.model.NormalizedEvidence;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class CreditBureauReconciliationService {
  private static final List<String> SUMMARY_METRICS = List.of(
      "totalAccounts", "activeAccounts", "closedAccounts", "overdueOrDefaultAccounts",
      "securedAccounts", "unsecuredAccounts", "currentBalance", "sanctionedAmount",
      "creditHistoryMonths", "recentEnquiries", "maximumDaysPastDue", "writtenOffAccounts"
  );

  public CreditBureauReconciliation reconcile(List<NormalizedEvidence> evidence) {
    String countryCode = evidence.stream()
        .filter(item -> "CREDIT".equals(item.getDomain()))
        .map(NormalizedEvidence::getCountryCode)
        .filter(value -> value != null && !value.isBlank())
        .findFirst().orElse(null);
    return reconcile(evidence, countryCode);
  }

  public CreditBureauReconciliation reconcile(
      List<NormalizedEvidence> evidence, String countryCode
  ) {
    List<NormalizedEvidence> credit = evidence.stream()
        .filter(item -> "CREDIT".equals(item.getDomain()))
        .filter(item -> countryCode == null
            || countryCode.equalsIgnoreCase(item.getCountryCode()))
        .toList();
    List<CreditBureauReconciliation.NativeScoreView> scores = credit.stream()
        .map(this::score).toList();
    Map<String, CreditBureauReconciliation.MetricRange> ranges = new LinkedHashMap<>();
    for (String metric : SUMMARY_METRICS) {
      List<BigDecimal> values = credit.stream()
          .map(item -> number(item.getPayload().path("summary").path(metric)))
          .filter(value -> value != null).toList();
      if (!values.isEmpty()) {
        BigDecimal minimum = values.stream().min(BigDecimal::compareTo).orElseThrow();
        BigDecimal maximum = values.stream().max(BigDecimal::compareTo).orElseThrow();
        ranges.put(metric, new CreditBureauReconciliation.MetricRange(
            minimum, maximum, values.size(), minimum.compareTo(maximum) != 0
        ));
      }
    }
    List<String> warnings = new ArrayList<>();
    if (credit.size() > 1) {
      warnings.add("Native bureau scores are preserved and are not averaged");
      if (ranges.values().stream().anyMatch(CreditBureauReconciliation.MetricRange::disagreement)) {
        warnings.add("Bureaus report different values for one or more summary metrics");
      }
      warnings.add("Masked account identifiers are not used for cross-bureau account matching");
    }
    return new CreditBureauReconciliation(
        "GCP_CREDIT_RECONCILIATION_V1", credit.size(), scores,
        Map.copyOf(ranges), List.copyOf(warnings)
    );
  }

  private CreditBureauReconciliation.NativeScoreView score(NormalizedEvidence evidence) {
    JsonNode nativeScore = evidence.getPayload().path("nativeScore");
    return new CreditBureauReconciliation.NativeScoreView(
        evidence.getCountryCode(), evidence.getProvider(), evidence.getSourceSystem(),
        integer(nativeScore, "value"), integer(nativeScore, "minimum"),
        integer(nativeScore, "maximum"), text(nativeScore, "model"),
        evidence.getCompletenessPercent()
    );
  }

  private Integer integer(JsonNode node, String field) {
    return node.path(field).isNumber() ? node.path(field).intValue() : null;
  }

  private String text(JsonNode node, String field) {
    return node.path(field).isTextual() ? node.path(field).asText() : null;
  }

  private BigDecimal number(JsonNode node) {
    return node.isNumber() ? node.decimalValue() : null;
  }
}
