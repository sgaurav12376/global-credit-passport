package com.synergyresources.gcp.passport.risk;

import com.fasterxml.jackson.databind.JsonNode;
import com.synergyresources.gcp.passport.model.NormalizedEvidence;
import com.synergyresources.gcp.passport.normalization.CreditBureauReconciliation;
import com.synergyresources.gcp.passport.normalization.EvidenceCoverage;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.HexFormat;
import java.util.LinkedHashSet;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DeterministicRiskAssessmentService {
  public static final String MODEL_VERSION = "GCP_RULES_V1_6";

  public RiskAssessment assess(
      List<NormalizedEvidence> evidence,
      EvidenceCoverage coverage,
      CreditBureauReconciliation reconciliation
  ) {
    NormalizedEvidence credit = bestCredit(evidence);
    NormalizedEvidence cashflow = best(evidence, "CASHFLOW");
    List<RiskAssessment.Dimension> dimensions = List.of(
        repayment(credit), utilization(credit), debtBurden(cashflow),
        cashflowCapacity(cashflow), incomeStability(cashflow), historyDepth(credit),
        recentEnquiries(credit)
    );
    List<String> missing = dimensions.stream().filter(dimension -> !dimension.available())
        .map(RiskAssessment.Dimension::key).toList();
    Integer index = coverage.sufficientForRiskAssessment() ? weightedIndex(dimensions) : null;
    String status = index == null ? "INSUFFICIENT_EVIDENCE" : "CALCULATED";
    List<String> disclosures = new ArrayList<>();
    disclosures.add("Pilot risk intelligence only; this is not a lender approval decision");
    disclosures.add("Missing dimensions are excluded, never treated as zero");
    disclosures.add("Native bureau scores are preserved and are not averaged");
    disclosures.add("Native score range position is a reference, not a cross-bureau equivalence");
    disclosures.add("Recent enquiries use the reporting window defined by the source bureau");
    if (!missing.isEmpty()) disclosures.add("Some risk dimensions are unavailable");
    RiskAssessment.CalculationTrace trace = calculationTrace(evidence, dimensions);
    List<RiskAssessment.NativeScoreReference> scoreReferences = nativeScoreReferences(
        reconciliation
    );
    List<RiskAssessment.Driver> drivers = keyDrivers(dimensions);
    RiskAssessment.ReviewGuidance guidance = reviewGuidance(
        index, coverage, reconciliation, dimensions, evidence
    );
    List<RiskAssessment.DimensionExplanation> explanations = dimensionExplanations(
        dimensions, credit, cashflow
    );
    return new RiskAssessment(
        "GCP_RISK_ASSESSMENT_V6", "DETERMINISTIC_RULES", MODEL_VERSION,
        status, index, riskBand(index), confidence(
            evidence, coverage, reconciliation, dimensions,
            isSynthetic(credit) || isSynthetic(cashflow)
        ),
        dimensions, explanations, assessmentEvidence(credit), crossBorderContext(evidence), scoreReferences,
        drivers, guidance, missing, trace,
        List.copyOf(disclosures), Instant.now()
    );
  }

  private List<RiskAssessment.DimensionExplanation> dimensionExplanations(
      List<RiskAssessment.Dimension> dimensions,
      NormalizedEvidence credit,
      NormalizedEvidence cashflow
  ) {
    return dimensions.stream().map(dimension -> switch (dimension.key()) {
      case "REPAYMENT_BEHAVIOR" -> explanation(dimension, credit,
          "credit.repayment_behavior", repaymentObserved(credit), "ACCOUNT_STATUS",
          "Starts at 100; deductions apply for days past due, overdue/default and write-offs");
      case "CREDIT_UTILIZATION" -> explanation(dimension, credit,
          "credit.utilization_ratio", ratioObserved(credit, "summary", "currentBalance",
              "sanctionedAmount"), "PERCENT",
          "≤10%=95; ≤30%=85; ≤50%=70; ≤75%=50; >75%=25");
      case "DEBT_BURDEN" -> explanation(dimension, cashflow,
          "cashflow.debt_to_income_ratio", ratioObserved(cashflow, "metrics",
              "averageMonthlyDebtPayments", "averageMonthlyIncome"), "PERCENT",
          "≤15%=95; ≤30%=80; ≤45%=60; ≤60%=40; >60%=20");
      case "CASHFLOW_CAPACITY" -> explanation(dimension, cashflow,
          "cashflow.net_cashflow_to_income_ratio", ratioObserved(cashflow, "metrics",
              "averageMonthlyNetCashflow", "averageMonthlyIncome"), "PERCENT",
          "≥30%=95; ≥15%=80; ≥0%=60; ≥-10%=35; <-10%=15");
      case "INCOME_STABILITY" -> explanation(dimension, cashflow,
          "cashflow.income_stability_percent", fieldObserved(cashflow, "metrics",
              "incomeStabilityPercent"), "PERCENT",
          "Normalized stability percentage is clamped to the 0–100 scoring range");
      case "CREDIT_HISTORY_DEPTH" -> explanation(dimension, credit,
          "credit.history_months", fieldObserved(credit, "summary", "creditHistoryMonths"),
          "MONTHS", "≥120=95; ≥60=85; ≥36=75; ≥24=65; ≥12=50; <12=30");
      case "RECENT_CREDIT_ENQUIRIES" -> explanation(dimension, credit,
          "credit.recent_enquiries", fieldObserved(credit, "summary", "recentEnquiries"),
          "COUNT", "0=95; 1–2=85; 3–4=70; 5–6=50; 7–10=30; >10=15");
      default -> explanation(dimension, null, dimension.key().toLowerCase(), null,
          "UNAVAILABLE", "No scoring rule recorded");
    }).toList();
  }

  private RiskAssessment.DimensionExplanation explanation(
      RiskAssessment.Dimension dimension,
      NormalizedEvidence source,
      String metric,
      String observedValue,
      String unit,
      String rule
  ) {
    String evidenceStatus = source == null ? "MISSING"
        : "GCP_SIMULATOR".equals(source.getProvider())
            || (source.getSourceSystem() != null
                && source.getSourceSystem().contains("SIMULATED")) ? "SYNTHETIC"
            : "NORMALIZED_PROVIDER_EVIDENCE";
    BigDecimal contribution = dimension.score() == null ? null
        : BigDecimal.valueOf(dimension.score())
            .multiply(BigDecimal.valueOf(dimension.configuredWeight()))
            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    return new RiskAssessment.DimensionExplanation(
        dimension.key(), metric, observedValue, unit,
        source == null ? null : source.getDomain(),
        source == null ? null : source.getProvider(),
        source == null ? null : source.getSourceSystem(),
        source == null ? null : source.getCountryCode(),
        source == null ? null : source.getId(), evidenceStatus, rule,
        dimension.score(), dimension.configuredWeight(), contribution
    );
  }

  private RiskAssessment.AssessmentEvidence assessmentEvidence(NormalizedEvidence credit) {
    if (credit == null) return null;
    return new RiskAssessment.AssessmentEvidence(
        credit.getProvider(), credit.getSourceSystem(), credit.getCountryCode(),
        credit.getCompletenessPercent(), credit.getRetrievedAt(),
        "CONFIGURED_BUREAU_PRIORITY_WITH_COMPLETENESS",
        "Credit factors use one sufficiently complete structured bureau record. Native bureau scores are preserved separately and are not averaged."
    );
  }

  private RiskAssessment.CrossBorderContext crossBorderContext(
      List<NormalizedEvidence> evidence
  ) {
    List<String> countries = new ArrayList<>(evidence.stream()
        .map(NormalizedEvidence::getCountryCode)
        .filter(country -> country != null && !country.isBlank())
        .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new)));
    return new RiskAssessment.CrossBorderContext(
        List.copyOf(countries), true,
        "Ratios are calculated within each source currency; monetary amounts are not compared across currencies unless an auditable conversion is supplied",
        "Destination-country eligibility, affordability thresholds and approval policy remain with the lender",
        List.of(
            "Country of origin is not used as a negative risk factor",
            "Native bureau scores remain in their original scale and are not converted into a destination-country bureau score",
            "Observation windows and source definitions remain visible in evidence provenance"
        )
    );
  }

  private String repaymentObserved(NormalizedEvidence evidence) {
    if (evidence == null) return null;
    JsonNode summary = evidence.getPayload().path("summary");
    List<String> values = new ArrayList<>();
    addObserved(values, "max DPD", integer(summary, "maximumDaysPastDue"));
    addObserved(values, "overdue/default accounts", integer(summary, "overdueOrDefaultAccounts"));
    addObserved(values, "written-off accounts", integer(summary, "writtenOffAccounts"));
    return values.isEmpty() ? null : String.join("; ", values);
  }

  private void addObserved(List<String> values, String label, Integer value) {
    if (value != null) values.add(label + " " + value);
  }

  private String ratioObserved(
      NormalizedEvidence evidence, String section, String numerator, String denominator
  ) {
    if (evidence == null) return null;
    JsonNode node = evidence.getPayload().path(section);
    BigDecimal top = decimal(node, numerator);
    BigDecimal bottom = decimal(node, denominator);
    if (top == null || bottom == null || bottom.signum() <= 0) return null;
    return top.divide(bottom, 4, RoundingMode.HALF_UP)
        .multiply(BigDecimal.valueOf(100)).setScale(1, RoundingMode.HALF_UP).toPlainString();
  }

  private String fieldObserved(
      NormalizedEvidence evidence, String section, String field
  ) {
    if (evidence == null) return null;
    JsonNode value = evidence.getPayload().path(section).path(field);
    return value.isNumber() ? value.decimalValue().stripTrailingZeros().toPlainString() : null;
  }

  private List<RiskAssessment.NativeScoreReference> nativeScoreReferences(
      CreditBureauReconciliation reconciliation
  ) {
    return reconciliation.nativeScores().stream().map(score -> {
      Integer position = null;
      if (score.value() != null && score.minimum() != null && score.maximum() != null
          && score.maximum() > score.minimum()) {
        position = clamp(Math.round(
            (score.value() - score.minimum()) * 100f / (score.maximum() - score.minimum())
        ));
      }
      return new RiskAssessment.NativeScoreReference(
          score.countryCode(), score.provider(), score.bureau(), score.value(),
          score.minimum(), score.maximum(), position,
          position == null ? "UNAVAILABLE" : dimensionBand(position), score.model()
      );
    }).toList();
  }

  private List<RiskAssessment.Driver> keyDrivers(List<RiskAssessment.Dimension> dimensions) {
    List<RiskAssessment.Dimension> available = dimensions.stream()
        .filter(RiskAssessment.Dimension::available).toList();
    LinkedHashMap<String, RiskAssessment.Dimension> selected = new LinkedHashMap<>();
    available.stream().sorted(Comparator.comparingInt(RiskAssessment.Dimension::score))
        .limit(2).forEach(item -> selected.put(item.key(), item));
    available.stream().sorted(Comparator.comparingInt(RiskAssessment.Dimension::score).reversed())
        .limit(2).forEach(item -> selected.put(item.key(), item));
    return selected.values().stream().map(item -> new RiskAssessment.Driver(
        item.key(), item.label(), item.score() >= 80 ? "STRENGTH"
            : item.score() < 60 ? "WATCH" : "NEUTRAL",
        item.score(), item.reasonCodes()
    )).toList();
  }

  private RiskAssessment.ReviewGuidance reviewGuidance(
      Integer index,
      EvidenceCoverage coverage,
      CreditBureauReconciliation reconciliation,
      List<RiskAssessment.Dimension> dimensions,
      List<NormalizedEvidence> evidence
  ) {
    int availableWeight = dimensions.stream().filter(RiskAssessment.Dimension::available)
        .mapToInt(RiskAssessment.Dimension::configuredWeight).sum();
    String priority = index == null || availableWeight < 60 ? "DATA_REQUIRED"
        : index < 50 ? "ENHANCED_REVIEW" : "STANDARD_REVIEW";
    boolean credit = best(evidence, "CREDIT") != null;
    boolean cashflow = best(evidence, "CASHFLOW") != null;
    String basis = credit && cashflow ? "CREDIT_AND_CASHFLOW"
        : credit ? "CREDIT_ONLY" : cashflow ? "CASHFLOW_ONLY" : "LIMITED_EVIDENCE";
    List<String> gaps = dimensions.stream().filter(item -> !item.available())
        .map(item -> item.key() + ":" + item.reasonCodes().get(0)).toList();
    List<String> actions = new ArrayList<>();
    if (!credit) actions.add("REQUEST_VERIFIED_CREDIT_EVIDENCE");
    if (!cashflow) actions.add("REQUEST_CONSENTED_CASHFLOW_EVIDENCE");
    if (dimensions.stream().anyMatch(item -> !item.available()
        && ("DEBT_BURDEN".equals(item.key()) || "CASHFLOW_CAPACITY".equals(item.key())
            || "INCOME_STABILITY".equals(item.key())))) {
      actions.add("REVIEW_INCOME_AND_CASHFLOW_DATA_GAPS");
    }
    if (reconciliation.summaryRanges().values().stream()
        .anyMatch(CreditBureauReconciliation.MetricRange::disagreement)) {
      actions.add("RECONCILE_CROSS_BUREAU_DIFFERENCES");
    }
    if (!coverage.sufficientForRiskAssessment()) actions.add("COLLECT_ADDITIONAL_EVIDENCE");
    if (index != null && index < 50) actions.add("REVIEW_ADVERSE_RISK_DRIVERS");
    if (actions.isEmpty()) actions.add("APPLY_LENDER_POLICY_AND_UNDERWRITING_REVIEW");
    return new RiskAssessment.ReviewGuidance(
        priority, basis, gaps, List.copyOf(actions), true
    );
  }

  private RiskAssessment.CalculationTrace calculationTrace(
      List<NormalizedEvidence> evidence,
      List<RiskAssessment.Dimension> dimensions
  ) {
    List<RiskAssessment.EvidenceReference> references = evidence.stream()
        .sorted(Comparator.comparing((NormalizedEvidence item) -> item.getDomain())
            .thenComparing(item -> item.getProvider())
            .thenComparing(item -> item.getSourceSystem())
            .thenComparing(item -> item.getId() == null ? "" : item.getId().toString()))
        .map(item -> new RiskAssessment.EvidenceReference(
            item.getId(), item.getDomain(), item.getCountryCode(), item.getProvider(),
            item.getSourceSystem(), item.getSchemaVersion(), item.getAdapterId(),
            item.getAdapterVersion(), item.getCompletenessPercent(), item.getRetrievedAt()
        )).toList();
    int totalWeight = dimensions.stream()
        .mapToInt(RiskAssessment.Dimension::configuredWeight).sum();
    int availableWeight = dimensions.stream().filter(RiskAssessment.Dimension::available)
        .mapToInt(RiskAssessment.Dimension::configuredWeight).sum();
    String fingerprintMaterial = MODEL_VERSION + "|" + references.stream()
        .map(reference -> String.join(":",
            value(reference.evidenceId()), value(reference.domain()),
            value(reference.countryCode()), value(reference.provider()),
            value(reference.sourceSystem()), value(reference.schemaVersion()),
            value(reference.adapterId()), value(reference.adapterVersion()),
            Integer.toString(reference.completenessPercent()), value(reference.retrievedAt())))
        .reduce((left, right) -> left + "|" + right).orElse("");
    return new RiskAssessment.CalculationTrace(
        "WEIGHTED_MEAN_OF_AVAILABLE_DIMENSIONS", availableWeight, totalWeight,
        sha256(fingerprintMaterial), references
    );
  }

  private String value(Object value) {
    return value == null ? "" : value.toString();
  }

  private String sha256(String value) {
    try {
      return HexFormat.of().formatHex(
          MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))
      );
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is unavailable", exception);
    }
  }

  private RiskAssessment.Dimension repayment(NormalizedEvidence credit) {
    if (credit == null) return unavailable("REPAYMENT_BEHAVIOR", "Repayment behavior", 23);
    JsonNode summary = credit.getPayload().path("summary");
    Integer dpd = integer(summary, "maximumDaysPastDue");
    Integer overdue = integer(summary, "overdueOrDefaultAccounts");
    Integer writtenOff = integer(summary, "writtenOffAccounts");
    if (dpd == null && overdue == null && writtenOff == null) {
      return unavailable("REPAYMENT_BEHAVIOR", "Repayment behavior", 23);
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
    return available("REPAYMENT_BEHAVIOR", "Repayment behavior", 23, score, reasons);
  }

  private RiskAssessment.Dimension utilization(NormalizedEvidence credit) {
    if (credit == null) return unavailable("CREDIT_UTILIZATION", "Credit utilization", 14);
    JsonNode summary = credit.getPayload().path("summary");
    BigDecimal balance = decimal(summary, "currentBalance");
    BigDecimal limit = decimal(summary, "sanctionedAmount");
    if (balance == null || limit == null || limit.signum() <= 0) {
      return unavailable("CREDIT_UTILIZATION", "Credit utilization", 14);
    }
    BigDecimal ratio = balance.divide(limit, 4, RoundingMode.HALF_UP);
    int score = ratio.compareTo(new BigDecimal("0.10")) <= 0 ? 95
        : ratio.compareTo(new BigDecimal("0.30")) <= 0 ? 85
        : ratio.compareTo(new BigDecimal("0.50")) <= 0 ? 70
        : ratio.compareTo(new BigDecimal("0.75")) <= 0 ? 50 : 25;
    return available("CREDIT_UTILIZATION", "Credit utilization", 14, score,
        List.of("UTILIZATION_" + ratio.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP) + "_PERCENT"));
  }

  private RiskAssessment.Dimension debtBurden(NormalizedEvidence cashflow) {
    if (cashflow == null) return unavailable(
        "DEBT_BURDEN", "Debt burden", 14, "CASHFLOW_EVIDENCE_UNAVAILABLE"
    );
    JsonNode metrics = cashflow.getPayload().path("metrics");
    BigDecimal income = decimal(metrics, "averageMonthlyIncome");
    BigDecimal debt = decimal(metrics, "averageMonthlyDebtPayments");
    if (income == null || income.signum() <= 0) {
      return unavailable("DEBT_BURDEN", "Debt burden", 14,
          "POSITIVE_ANALYZED_INCOME_UNAVAILABLE");
    }
    if (debt == null) {
      return unavailable("DEBT_BURDEN", "Debt burden", 14,
          "DEBT_PAYMENT_METRIC_UNAVAILABLE");
    }
    BigDecimal ratio = debt.divide(income, 4, RoundingMode.HALF_UP);
    int score = ratio.compareTo(new BigDecimal("0.15")) <= 0 ? 95
        : ratio.compareTo(new BigDecimal("0.30")) <= 0 ? 80
        : ratio.compareTo(new BigDecimal("0.45")) <= 0 ? 60
        : ratio.compareTo(new BigDecimal("0.60")) <= 0 ? 40 : 20;
    return available("DEBT_BURDEN", "Debt burden", 14, score,
        List.of("DEBT_TO_INCOME_" + percent(ratio)));
  }

  private RiskAssessment.Dimension cashflowCapacity(NormalizedEvidence cashflow) {
    if (cashflow == null) return unavailable(
        "CASHFLOW_CAPACITY", "Cash-flow capacity", 18, "CASHFLOW_EVIDENCE_UNAVAILABLE"
    );
    JsonNode metrics = cashflow.getPayload().path("metrics");
    BigDecimal income = decimal(metrics, "averageMonthlyIncome");
    BigDecimal net = decimal(metrics, "averageMonthlyNetCashflow");
    if (income == null || income.signum() <= 0) {
      return unavailable("CASHFLOW_CAPACITY", "Cash-flow capacity", 18,
          "POSITIVE_ANALYZED_INCOME_UNAVAILABLE");
    }
    if (net == null) {
      return unavailable("CASHFLOW_CAPACITY", "Cash-flow capacity", 18,
          "NET_CASHFLOW_METRIC_UNAVAILABLE");
    }
    BigDecimal ratio = net.divide(income, 4, RoundingMode.HALF_UP);
    int score = ratio.compareTo(new BigDecimal("0.30")) >= 0 ? 95
        : ratio.compareTo(new BigDecimal("0.15")) >= 0 ? 80
        : ratio.signum() >= 0 ? 60
        : ratio.compareTo(new BigDecimal("-0.10")) >= 0 ? 35 : 15;
    return available("CASHFLOW_CAPACITY", "Cash-flow capacity", 18, score,
        List.of(ratio.signum() >= 0 ? "POSITIVE_NET_CASHFLOW" : "NEGATIVE_NET_CASHFLOW",
            "NET_CASHFLOW_TO_INCOME_" + percent(ratio)));
  }

  private RiskAssessment.Dimension incomeStability(NormalizedEvidence cashflow) {
    if (cashflow == null) return unavailable(
        "INCOME_STABILITY", "Income stability", 13, "CASHFLOW_EVIDENCE_UNAVAILABLE"
    );
    JsonNode metrics = cashflow.getPayload().path("metrics");
    BigDecimal stability = decimal(metrics, "incomeStabilityPercent");
    if (stability == null) {
      Integer completeMonths = integer(metrics, "completeMonthsAnalyzed");
      if (completeMonths == null || completeMonths < 2) return unavailable(
          "INCOME_STABILITY", "Income stability", 13,
          "INSUFFICIENT_COMPLETE_MONTHS_FOR_STABILITY"
      );
      BigDecimal income = decimal(metrics, "averageMonthlyIncome");
      if (income == null || income.signum() <= 0) return unavailable(
          "INCOME_STABILITY", "Income stability", 13,
          "POSITIVE_ANALYZED_INCOME_UNAVAILABLE"
      );
      return unavailable("INCOME_STABILITY", "Income stability", 13,
          "INCOME_STABILITY_METRIC_UNAVAILABLE");
    }
    int score = clamp(stability.setScale(0, RoundingMode.HALF_UP).intValue());
    return available("INCOME_STABILITY", "Income stability", 13, score,
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

  private RiskAssessment.Dimension recentEnquiries(NormalizedEvidence credit) {
    if (credit == null) return unavailable(
        "RECENT_CREDIT_ENQUIRIES", "Recent credit enquiries", 8,
        "CREDIT_EVIDENCE_UNAVAILABLE"
    );
    Integer enquiries = integer(credit.getPayload().path("summary"), "recentEnquiries");
    if (enquiries == null) return unavailable(
        "RECENT_CREDIT_ENQUIRIES", "Recent credit enquiries", 8,
        "RECENT_ENQUIRY_METRIC_UNAVAILABLE"
    );
    int score = enquiries == 0 ? 95 : enquiries <= 2 ? 85 : enquiries <= 4 ? 70
        : enquiries <= 6 ? 50 : enquiries <= 10 ? 30 : 15;
    return available(
        "RECENT_CREDIT_ENQUIRIES", "Recent credit enquiries", 8, score,
        List.of("RECENT_ENQUIRIES_" + enquiries)
    );
  }

  private RiskAssessment.Confidence confidence(
      List<NormalizedEvidence> evidence,
      EvidenceCoverage coverage,
      CreditBureauReconciliation reconciliation,
      List<RiskAssessment.Dimension> dimensions,
      boolean syntheticAssessmentEvidence
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
    int totalWeight = dimensions.stream().mapToInt(RiskAssessment.Dimension::configuredWeight).sum();
    int availableWeight = dimensions.stream().filter(RiskAssessment.Dimension::available)
        .mapToInt(RiskAssessment.Dimension::configuredWeight).sum();
    int analyticalAvailability = totalWeight == 0 ? 0
        : Math.round(availableWeight * 100f / totalWeight);
    int rawScore = Math.round(
        coverage.coveragePercent() * .25f + completeness * .20f + freshness * .15f
            + consistency * .10f + identityAssurance * .10f
            + analyticalAvailability * .20f
    );
    int score = clamp(rawScore);
    if (analyticalAvailability < 60 || identityAssurance < 50) {
      score = Math.min(score, 69);
    }
    if (syntheticAssessmentEvidence) {
      score = Math.min(score, 69);
    }
    return new RiskAssessment.Confidence(
        score, confidenceBand(score), coverage.coveragePercent(), completeness,
        freshness, consistency, identityAssurance, analyticalAvailability
    );
  }

  private boolean isSynthetic(NormalizedEvidence evidence) {
    return evidence != null && (
        "GCP_SIMULATOR".equals(evidence.getProvider())
            || (evidence.getSourceSystem() != null
                && evidence.getSourceSystem().toUpperCase().contains("SIMULATED"))
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

  private NormalizedEvidence bestCredit(List<NormalizedEvidence> evidence) {
    return evidence.stream().filter(item -> "CREDIT".equals(item.getDomain()))
        .max(Comparator.comparingInt((NormalizedEvidence item) -> isSynthetic(item) ? 0 : 1)
            .thenComparingInt(NormalizedEvidence::getCompletenessPercent)
            .thenComparingInt(item -> bureauPriority(item.getSourceSystem()))
            .thenComparing(item -> item.getRetrievedAt() == null ? Instant.EPOCH : item.getRetrievedAt()))
        .orElse(null);
  }

  private int bureauPriority(String sourceSystem) {
    if (sourceSystem == null) return 0;
    return switch (sourceSystem.toUpperCase()) {
      case "CIBIL", "CIBIL_SIMULATED" -> 4;
      case "EQUIFAX" -> 3;
      case "EXPERIAN" -> 2;
      case "CRIF" -> 1;
      default -> 0;
    };
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
