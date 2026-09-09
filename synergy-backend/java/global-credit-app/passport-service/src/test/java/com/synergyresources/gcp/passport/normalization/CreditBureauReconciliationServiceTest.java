package com.synergyresources.gcp.passport.normalization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.model.NormalizedEvidence;
import java.util.List;
import org.junit.jupiter.api.Test;

class CreditBureauReconciliationServiceTest {
  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void preservesNativeScoresAndReportsSummaryDisagreementWithoutAveraging() throws Exception {
    NormalizedEvidence equifax = credit("EQUIFAX", 785, 1, 1200);
    NormalizedEvidence experian = credit("EXPERIAN", 790, 2, 1500);

    CreditBureauReconciliation result =
        new CreditBureauReconciliationService().reconcile(List.of(equifax, experian));

    assertEquals(2, result.bureauCount());
    assertEquals(List.of(785, 790), result.nativeScores().stream()
        .map(CreditBureauReconciliation.NativeScoreView::value).toList());
    assertEquals("1", result.summaryRanges().get("totalAccounts").minimum().toPlainString());
    assertEquals("2", result.summaryRanges().get("totalAccounts").maximum().toPlainString());
    assertTrue(result.summaryRanges().get("currentBalance").disagreement());
    assertTrue(result.warnings().stream().anyMatch(value -> value.contains("not averaged")));
  }

  private NormalizedEvidence credit(
      String bureau, int score, int totalAccounts, int currentBalance
  ) throws Exception {
    NormalizedEvidence evidence = new NormalizedEvidence();
    evidence.setDomain("CREDIT");
    evidence.setCountryCode("IN");
    evidence.setProvider("SUREPASS");
    evidence.setSourceSystem(bureau);
    evidence.setCompletenessPercent(75);
    evidence.setPayload(mapper.readTree("""
        {"nativeScore":{"value":%d,"minimum":300,"maximum":900,"model":"%s"},
         "summary":{"totalAccounts":%d,"currentBalance":%d}}
        """.formatted(score, bureau, totalAccounts, currentBalance)));
    return evidence;
  }
}
