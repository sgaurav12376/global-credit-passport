package com.synergyresources.gcp.passport.normalization;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.synergyresources.gcp.passport.setu.SetuFinancialSummaryCalculator;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static com.synergyresources.gcp.passport.setu
    .SetuFinancialSummaryCalculator.Category.*;
import static com.synergyresources.gcp.passport.setu
    .SetuFinancialSummaryCalculator.Direction.*;

class SetuCashflowNormalizationAdapterTest {

    private final ObjectMapper json =
        new ObjectMapper().findAndRegisterModules();

    private final SetuCashflowNormalizationAdapter adapter =
        new SetuCashflowNormalizationAdapter(json);

    private final SetuFinancialSummaryCalculator calculator =
        new SetuFinancialSummaryCalculator();

    private final LocalDate from =
        LocalDate.parse("2026-01-01");

    private final LocalDate to =
        LocalDate.parse("2026-02-28");

    private final Set<YearMonth> months = Set.of(
        YearMonth.of(2026, 1),
        YearMonth.of(2026, 2)
    );

    private NormalizationContext context(
        String country,
        String provider,
        String sourceSystem
    ) {
        return new NormalizationContext(
            country,
            provider,
            sourceSystem,
            "setu-synthetic-fixture-001",
            "gcp-local-setu-fixture-v1",
            null,
            Instant.parse("2026-03-01T00:00:00Z"),
            null
        );
    }

    private NormalizationContext syntheticContext() {
        return context(
            "IN",
            "GCP_SIMULATOR",
            "SETU_CASHFLOW_FIXTURE"
        );
    }

    private SetuFinancialSummaryCalculator.Transaction tx(
        String id,
        String date,
        String amount,
        SetuFinancialSummaryCalculator.Direction direction,
        SetuFinancialSummaryCalculator.Category category
    ) {
        return new SetuFinancialSummaryCalculator.Transaction(
            "synthetic-bank",
            "synthetic-account",
            id,
            LocalDate.parse(date),
            "INR",
            direction,
            new BigDecimal(amount),
            category
        );
    }

    private SetuFinancialSummaryCalculator.FinancialSummary
            summary() {

        return calculator.calculate(
            List.of(
                tx("1", "2026-01-05", "120000",
                    CREDIT, INCOME),
                tx("2", "2026-01-12", "55000",
                    DEBIT, EXPENSE),
                tx("3", "2026-01-20", "25000",
                    DEBIT, DEBT_PAYMENT),
                tx("4", "2026-02-05", "130000",
                    CREDIT, INCOME),
                tx("5", "2026-02-12", "65000",
                    DEBIT, EXPENSE),
                tx("6", "2026-02-20", "25000",
                    DEBIT, DEBT_PAYMENT)
            ),
            from,
            to,
            months
        );
    }

    @Test
    void mapsToExistingCashflowContract() {

        var result =
            adapter.normalize(summary(), syntheticContext());

        assertEquals("GCP_CASHFLOW_V1",
            result.schemaVersion());

        assertEquals(new BigDecimal("125000.00"),
            result.metrics().averageMonthlyIncome());

        assertEquals(new BigDecimal("85000.00"),
            result.metrics().averageMonthlyOutflows());

        assertEquals(new BigDecimal("25000.00"),
            result.metrics().averageMonthlyDebtPayments());

        assertEquals(new BigDecimal("40000.00"),
            result.metrics().averageMonthlyNetCashflow());

        assertEquals(new BigDecimal("96.00"),
            result.metrics().incomeStabilityPercent());
    }

    @Test
    void preservesSyntheticProvenance() {

        var result =
            adapter.normalize(summary(), syntheticContext());

        assertEquals("IN",
            result.provenance().countryCode());

        assertEquals("GCP_SIMULATOR",
            result.provenance().provider());

        assertEquals("SETU_CASHFLOW_FIXTURE",
            result.provenance().sourceSystem());

        assertEquals("setu-cashflow",
            result.provenance().adapterId());

        assertEquals("0.2.0",
            result.provenance().adapterVersion());

        assertNull(result.provenance().consentedAt());
    }

    @Test
    void preservesMonthlyCashflow() {

        var result =
            adapter.normalize(summary(), syntheticContext());

        assertTrue(result.monthlyCashflow().isArray());

        assertEquals(2, result.monthlyCashflow().size());

        assertEquals(6,
            result.metrics().analyzedTransactions());
    }

    @Test
    void recordsDataQualityAndSyntheticWarnings() {

        var result =
            adapter.normalize(summary(), syntheticContext());

        assertEquals(100,
            result.dataQuality().completenessPercent());

        assertTrue(result.dataQuality().warnings().stream()
            .anyMatch(w -> w.contains("Synthetic")));

        assertTrue(result.dataQuality().warnings().stream()
            .anyMatch(w -> w.contains("INR")));
    }

    @Test
    void preservesMissingMetrics() {

        var source = calculator.calculate(
            List.of(), from, to, months
        );

        var result =
            adapter.normalize(source, syntheticContext());

        assertNull(result.metrics().averageMonthlyIncome());

        assertNull(
            result.metrics().averageMonthlyDebtPayments());

        assertNull(result.metrics().incomeStabilityPercent());

        assertEquals(0,
            result.dataQuality().completenessPercent());
    }

    @Test
    void rejectsIncorrectCountry() {

        assertThrows(
            IllegalArgumentException.class,
            () -> adapter.normalize(
                summary(),
                context(
                    "US",
                    "GCP_SIMULATOR",
                    "SETU_CASHFLOW_FIXTURE"
                )
            )
        );
    }

    @Test
    void rejectsLiveProviderProvenance() {

        assertThrows(
            IllegalArgumentException.class,
            () -> adapter.normalize(
                summary(),
                context(
                    "IN",
                    "SETU",
                    "ACCOUNT_AGGREGATOR"
                )
            )
        );
    }

    @Test
    void serializesStandardizedMetrics() {

        var result =
            adapter.normalize(summary(), syntheticContext());

        var payload = json.valueToTree(result);

        assertEquals("GCP_CASHFLOW_V1",
            payload.path("schemaVersion").asText());

        assertEquals(0,
            new BigDecimal("125000").compareTo(
                payload.path("metrics")
                    .path("averageMonthlyIncome")
                    .decimalValue()
            )
        );

        assertEquals("IN",
            payload.path("provenance")
                .path("countryCode").asText());
    }

    @Test
    void exposesStructuredCurrencyAndEnvironment() {

        var result =
            adapter.normalize(summary(), syntheticContext());

        assertEquals("INR", result.currencyCode());

        assertEquals(
            GcpNormalized.EvidenceEnvironment.SYNTHETIC,
            result.evidenceEnvironment()
        );
    }

    @Test
    void serializesStructuredMetadata() {

        var payload = json.valueToTree(
            adapter.normalize(summary(), syntheticContext())
        );

        assertEquals(
            "INR",
            payload.path("currencyCode").asText()
        );

        assertEquals(
            "SYNTHETIC",
            payload.path("evidenceEnvironment").asText()
        );
    }

}
