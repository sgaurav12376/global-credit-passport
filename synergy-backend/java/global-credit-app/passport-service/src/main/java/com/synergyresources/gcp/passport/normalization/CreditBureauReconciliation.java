package com.synergyresources.gcp.passport.normalization;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record CreditBureauReconciliation(
    String schemaVersion,
    int bureauCount,
    List<NativeScoreView> nativeScores,
    Map<String, MetricRange> summaryRanges,
    List<String> warnings
) {
  public record NativeScoreView(
      String countryCode,
      String provider,
      String bureau,
      Integer value,
      Integer minimum,
      Integer maximum,
      String model,
      int completenessPercent
  ) {}

  public record MetricRange(
      BigDecimal minimum,
      BigDecimal maximum,
      int reportingBureaus,
      boolean disagreement
  ) {}
}
