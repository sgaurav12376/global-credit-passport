package com.synergyresources.gcp.passport.normalization;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.surepass.NormalizedCreditReport;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class IndependentNormalizationTest {
  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void creditAndCashflowNormalizeWithoutDependingOnEachOther() throws Exception {
    var context = new NormalizationContext(
        "IN", "SUREPASS", "EQUIFAX", "report-1", "consent-v1",
        Instant.parse("2026-09-09T10:00:00Z"),
        Instant.parse("2026-09-09T10:01:00Z"), null
    );
    var credit = new CreditNormalizationAdapter().normalize(
        new NormalizedCreditReport(
            "EQUIFAX", "report-1", 785, 300, 900, List.of(),
            new NormalizedCreditReport.Summary(
                1, 1, 0, 0, null, null, new BigDecimal("1200"),
                new BigDecimal("100000"), null, 1, null, 0
            ), List.of(), List.of("Detailed payment history unavailable")
        ), context
    );
    var cashflow = new PlaidCashflowNormalizationAdapter().normalize(
        mapper.readTree("""
          {"institutionConnections":1,"depositoryAccounts":2,"analyzedTransactions":40,
           "coverageStart":"2026-03-01","coverageEnd":"2026-09-01",
           "completeMonthsAnalyzed":5,"averageMonthlyDetectedIncome":6000,
           "averageMonthlyOutflows":4200,"averageMonthlyDebtPayments":500,
           "averageMonthlySustainableNetCashflow":1800,"incomeStabilityPercent":88}
          """),
        new NormalizationContext(
            "US", "PLAID", "OPEN_BANKING", "snapshot-1", "plaid-consent-v1",
            Instant.parse("2026-09-09T10:00:00Z"),
            Instant.parse("2026-09-09T10:01:00Z"), null
        )
    );

    assertEquals("GCP_CREDIT_V1", credit.schemaVersion());
    assertEquals(785, credit.nativeScore().value());
    assertEquals("GCP_CASHFLOW_V1", cashflow.schemaVersion());
    assertEquals(new BigDecimal("1800"), cashflow.metrics().averageMonthlyNetCashflow());
    assertTrue(cashflow.dataQuality().completenessPercent() >= 80);
  }

  @Test
  void cashflowCompletenessIsCappedWithoutTwoCompleteMonths() throws Exception {
    var cashflow = new PlaidCashflowNormalizationAdapter().normalize(
        mapper.readTree("""
          {"analyzedTransactions":40,"coverageStart":"2026-08-01",
           "coverageEnd":"2026-09-01","completeMonthsAnalyzed":0,
           "averageMonthlyDetectedIncome":0,"averageMonthlyOutflows":0}
          """),
        new NormalizationContext(
            "US", "PLAID", "OPEN_BANKING", "snapshot-2", "plaid-consent-v1",
            Instant.parse("2026-09-09T10:00:00Z"),
            Instant.parse("2026-09-09T10:01:00Z"), null
        )
    );

    assertEquals(50, cashflow.dataQuality().completenessPercent());
    assertTrue(cashflow.dataQuality().warnings().stream()
        .anyMatch(value -> value.contains("two complete months")));
  }
}
