package com.synergyresources.gcp.passport.risk;

import com.fasterxml.jackson.databind.JsonNode;
import com.synergyresources.gcp.passport.model.NormalizedEvidence;
import com.synergyresources.gcp.passport.normalization.CreditBureauReconciliation;
import com.synergyresources.gcp.passport.normalization.EvidenceCoverage;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DeterministicRiskAssessmentService {
  public static final String MODEL_VERSION = "GCP_RULES_V1";

  public RiskAssessment assess(
      List<NormalizedEvidence> evidence,
      EvidenceCoverage coverage,
      CreditBureauReconciliation reconciliation
  ) {
    NormalizedEvidence credit = best(evidence, "CREDIT");
    NormalizedEvidence cashflow = best(evidence, "CASHFLOW");
    List<RiskAssessment.Dimension> dimensions = List.of(
        repayment(credit), utilization(credit), debtBurden(cashflow),
        cashflowCapacity(cashflow), incomeStability(cashflow), historyDepth(credit)
    );
    List<String> missing = dimensions.stream().filter(dimension -> !dimension.available())
        .map(RiskAssessment.Dimension::key).toList();
    Integer index = coverage.sufficientForRiskAssessment() ? weightedIndex(dimensions) : null;
    String status = index == null ? "INSUFFICIENT_EVIDENCE" : "CALCULATED";
    List<String> disclosures = new ArrayList<>();
    disclosures.add("Pilot risk intelligence only; this is not a lender approval decision");
    disclosures.add("Missing dimensions are excluded, never treated as zero");
    disclosures.add("Native bureau scores are preserved and are not averaged");
    if (!missing.isEmpty()) disclosures.add("Some risk dimensions are unavailable");
    return new RiskAssessment(
        "GCP_RISK_ASSESSMENT_V1", "DETERMINISTIC_RULES", MODEL_VERSION,
        status, index, riskBand(index), confidence(
            evidence, coverage, reconciliation, dimensions
        ),
        dimensions, missing, List.copyOf(disclosures), Instant.now()
    );
  }

  private RiskAssessment.Dimension repayment(NormalizedEvidence credit) {
    if (credit == null) return unavailable("REPAYMENT_BEHAVIOR", "Repayment behavior", 25);
    JsonNode summary = credit.getPayload().path("summary");
    Integer dpd = integer(summary, "maximumDaysPastDue");
    Integer overdue = integer(summary, "overdueOrDefaultAccounts");
    Integer writtenOff = integer(summary, "writtenOffAccounts");
    if (dpd == null && overdue == null && writtenOff == null) {
      return unavailable("REPAYMENT_BEHAVIOR", "Repayment behavior", 25);
    }
    int score = 100;
    List<String> reasons = new ArrayList<>();
    if (dpd != null) {
      score -= dpd == 0 ? 0 : dpd <= 30 ? 15 : dpd <= 60 ? 40 : 70;
      reasons.add(dpd == 0 ? "NO_REPORTED_DELINQUENCY" : "REPORTED_DAYS_PAST_DUE");
    }
    if (overdue != null && overdue > 0) {
      score -= Math.min(45, overdue * 15);
      reasons.add("OVERDUE_OR_DEFAULT_ACCOUNTS");
    }
    if (writtenOff != null && writtenOff > 0) {
      score -= Math.min(60, writtenOff * 30);
      reasons.add("WRITTEN_OFF_ACCOUNTS");
    }
    if (reasons.isEmpty()) reasons.add("NO_ADVERSE_REPAYMENT_DATA_REPORTED");
    return available("REPAYMENT_BEHAVIOR", "Repayment behavior", 25, score, reasons);
  }

  private RiskAssessment.Dimension utilization(NormalizedEvidence credit) {
    if (credit == null) return unavailable("CREDIT_UTILIZATION", "Credit utilization", 15);
    JsonNode summary = credit.getPayload().path("summary");
    BigDecimal balance = decimal(summary, "currentBalance");
    BigDecimal limit = decimal(summary, "sanctionedAmount");
    if (balance == null || limit == null || limit.signum() <= 0) {
      return unavailable("CREDIT_UTILIZATION", "Credit utilization", 15);
    }
    BigDecimal ratio = balance.divide(limit, 4, RoundingMode.HALF_UP);
    int score = ratio.compareTo(new BigDecimal("0.10")) <= 0 ? 95
        : ratio.compareTo(new BigDecimal("0.30")) <= 0 ? 85
        : ratio.compareTo(new BigDecimal("0.50")) <= 0 ? 70
        : ratio.compareTo(new BigDecimal("0.75")) <= 0 ? 50 : 25;
    return available("CREDIT_UTILIZATION", "Credit utilization", 15, score,
        List.of("UTILIZATION_" + ratio.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP) + "_PERCENT"));
  }

  private RiskAssessment.Dimension debtBurden(NormalizedEvidence cashflow) {
    if (cashflow == null) return unavailable(
        "DEBT_BURDEN", "Debt burden", 15, "CASHFLOW_EVIDENCE_UNAVAILABLE"
    );
    JsonNode metrics = cashflow.getPayload().path("metrics");
    BigDecimal income = decimal(metrics, "averageMonthlyIncome");
    BigDecimal debt = decimal(metrics, "averageMonthlyDebtPayments");
    if (income == null || income.signum() <= 0) {
      return unavailable("DEBT_BURDEN", "Debt burden", 15,
          "POSITIVE_ANALYZED_INCOME_UNAVAILABLE");
    }
    if (debt == null) {
      return unavailable("DEBT_BURDEN", "Debt burden", 15,
          "DEBT_PAYMENT_METRIC_UNAVAILABLE");
    }
    BigDecimal ratio = debt.divide(income, 4, RoundingMode.HALF_UP);
    int score = ratio.compareTo(new BigDecimal("0.15")) <= 0 ? 95
        : ratio.compareTo(new BigDecimal("0.30")) <= 0 ? 80
        : ratio.compareTo(new BigDecimal("0.45")) <= 0 ? 60
        : ratio.compareTo(new BigDecimal("0.60")) <= 0 ? 40 : 20;
    return available("DEBT_BURDEN", "Debt burden", 15, score,
        List.of("DEBT_TO_INCOME_" + percent(ratio)));
  }

  private RiskAssessment.Dimension cashflowCapacity(NormalizedEvidence cashflow) {
    if (cashflow == null) return unavailable(
        "CASHFLOW_CAPACITY", "Cash-flow capacity", 20, "CASHFLOW_EVIDENCE_UNAVAILABLE"
    );
    JsonNode metrics = cashflow.getPayload().path("metrics");
    BigDecimal income = decimal(metrics, "averageMonthlyIncome");
    BigDecimal net = decimal(metrics, "averageMonthlyNetCashflow");
    if (income == null || income.signum() <= 0) {
      return unavailable("CASHFLOW_CAPACITY", "Cash-flow capacity", 20,
          "POSITIVE_ANALYZED_INCOME_UNAVAILABLE");
    }
    if (net == null) {
      return unavailable("CASHFLOW_CAPACITY", "Cash-flow capacity", 20,
          "NET_CASHFLOW_METRIC_UNAVAILABLE");
    }
    BigDecimal ratio = net.divide(income, 4, RoundingMode.HALF_UP);
    int score = ratio.compareTo(new BigDecimal("0.30")) >= 0 ? 95
        : ratio.compareTo(new BigDecimal("0.15")) >= 0 ? 80
        : ratio.signum() >= 0 ? 60
        : ratio.compareTo(new BigDecimal("-0.10")) >= 0 ? 35 : 15;
    return available("CASHFLOW_CAPACITY", "Cash-flow capacity", 20, score,
        List.of(ratio.signum() >= 0 ? "POSITIVE_NET_CASHFLOW" : "NEGATIVE_NET_CASHFLOW",
            "NET_CASHFLOW_TO_INCOME_" + percent(ratio)));
  }

  private RiskAssessment.Dimension incomeStability(NormalizedEvidence cashflow) {
    if (cashflow == null) return unavailable(
        "INCOME_STABILITY", "Income stability", 15, "CASHFLOW_EVIDENCE_UNAVAILABLE"
    );
    BigDecimal stability = decimal(cashflow.getPayload().path("metrics"), "incomeStabilityPercent");
    if (stability == null) return unavailable(
        "INCOME_STABILITY", "Income stability", 15,
        "INSUFFICIENT_COMPLETE_MONTHS_FOR_STABILITY"
    );
    int score = clamp(stability.setScale(0, RoundingMode.HALF_UP).intValue());
    return available("INCOME_STABILITY", "Income stability", 15, score,
        List.of("INCOME_STABILITY_" + score + "_PERCENT"));
  }

  private RiskAssessment.Dimension historyDepth(NormalizedEvidence credit) {
    if (credit == null) return unavailable("CREDIT_HISTORY_DEPTH", "Credit-history depth", 10);
    Integer months = integer(credit.getPayload().path("summary"), "creditHistoryMonths");
    if (months == null) return unavailable("CREDIT_HISTORY_DEPTH", "Credit-history depth", 10);
    int score = months >= 120 ? 95 : months >= 60 ? 85 : months >= 36 ? 75
        : months >= 24 ? 65 : months >= 12 ? 50 : 30;
    return available("CREDIT_HISTORY_DEPTH", "Credit-history depth", 10, score,
        List.of("CREDIT_HISTORY_" + months + "_MONTHS"));
  }

  private RiskAssessment.Confidence confidence(
      List<NormalizedEvidence> evidence,
      EvidenceCoverage coverage,
      CreditBureauReconciliation reconciliation,
      List<RiskAssessment.Dimension> dimensions
  ) {
    int completeness = evidence.isEmpty() ? 0 : (int) Math.round(evidence.stream()
        .mapToInt(NormalizedEvidence::getCompletenessPercent).average().orElse(0));
    int freshness = evidence.isEmpty() ? 0 : (int) Math.round(evidence.stream()
        .mapToInt(this::freshness).average().orElse(0));
    long disagreements = reconciliation.summaryRanges().values().stream()
        .filter(CreditBureauReconciliation.MetricRange::disagreement).count();
    int consistency = reconciliation.bureauCount() == 0 ? 0
        : clamp(100 - (int) Math.min(60, disagreements * 15));
    NormalizedEvidence identity = best(evidence, "IDENTITY");
    int identityAssurance = identity == null ? 0
        : identity.getPayload().path("verified").asBoolean(false) ? 100
        : "DECLINED".equals(identity.getPayload().path("status").asText()) ? 25 : 40;
    int analyticalAvailability = (int) Math.round(dimensions.stream()
        .filter(RiskAssessment.Dimension::available).count() * 100d / dimensions.size());
    int score = Math.round(
        coverage.coveragePercent() * .25f + completeness * .20f + freshness * .15f
            + consistency * .10f + identityAssurance * .10f
            + analyticalAvailability * .20f
    );
    return new RiskAssessment.Confidence(
        clamp(score), confidenceBand(score), coverage.coveragePercent(), completeness,
        freshness, consistency, identityAssurance, analyticalAvailability
    );
  }

  private int freshness(NormalizedEvidence evidence) {
    if (evidence.getRetrievedAt() == null) return 0;
    long days = Math.max(0, Duration.between(evidence.getRetrievedAt(), Instant.now()).toDays());
    return days <= 30 ? 100 : days <= 90 ? 80 : days <= 180 ? 60 : days <= 365 ? 40 : 20;
  }

  private Integer weightedIndex(List<RiskAssessment.Dimension> dimensions) {
    int weighted = 0;
    int weights = 0;
    for (RiskAssessment.Dimension dimension : dimensions) {
      if (!dimension.available()) continue;
      weighted += dimension.score() * dimension.configuredWeight();
      weights += dimension.configuredWeight();
    }
    return weights == 0 ? null : Math.round((float) weighted / weights);
  }

  private NormalizedEvidence best(List<NormalizedEvidence> evidence, String domain) {
    return evidence.stream().filter(item -> domain.equals(item.getDomain()))
        .max(Comparator.comparingInt(NormalizedEvidence::getCompletenessPercent)
            .thenComparing(item -> item.getRetrievedAt() == null ? Instant.EPOCH : item.getRetrievedAt()))
        .orElse(null);
  }

  private RiskAssessment.Dimension available(
      String key, String label, int weight, int score, List<String> reasons
  ) {
    int value = clamp(score);
    return new RiskAssessment.Dimension(key, label, true, value, weight,
        dimensionBand(value), List.copyOf(reasons));
  }

  private RiskAssessment.Dimension unavailable(String key, String label, int weight) {
    return unavailable(key, label, weight, "INSUFFICIENT_DATA");
  }

  private RiskAssessment.Dimension unavailable(
      String key, String label, int weight, String reason
  ) {
    return new RiskAssessment.Dimension(
        key, label, false, null, weight, "UNAVAILABLE", List.of(reason)
    );
  }

  private Integer integer(JsonNode node, String field) {
    return node.path(field).isNumber() ? node.path(field).intValue() : null;
  }

  private BigDecimal decimal(JsonNode node, String field) {
    return node.path(field).isNumber() ? node.path(field).decimalValue() : null;
  }

  private String percent(BigDecimal ratio) {
    return ratio.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP) + "_PERCENT";
  }

  private int clamp(int value) { return Math.max(0, Math.min(100, value)); }
  private String dimensionBand(int score) {
    return score >= 80 ? "STRONG" : score >= 60 ? "ADEQUATE" : score >= 40 ? "WATCH" : "WEAK";
  }
  private String riskBand(Integer score) {
    if (score == null) return "NOT_CALCULATED";
    return score >= 80 ? "LOW_RISK" : score >= 65 ? "MODERATE_LOW_RISK"
        : score >= 50 ? "MODERATE_RISK" : "ELEVATED_RISK";
  }
  private String confidenceBand(int score) {
    return score >= 80 ? "HIGH" : score >= 60 ? "MEDIUM" : "LOW";
  }
}
