package com.synergyresources.gcp.passport.setu;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static com.synergyresources.gcp.passport.setu
    .SetuFinancialSummaryCalculator.Category.*;
import static com.synergyresources.gcp.passport.setu
    .SetuFinancialSummaryCalculator.Direction.*;

class SetuFinancialSummaryCalculatorTest {

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

    private List<SetuFinancialSummaryCalculator.Transaction>
            fixture() {

        return List.of(
            tx("1", "2026-01-05", "120000", CREDIT, INCOME),
            tx("2", "2026-01-12", "55000", DEBIT, EXPENSE),
            tx("3", "2026-01-20", "25000", DEBIT, DEBT_PAYMENT),

            tx("4", "2026-02-05", "130000", CREDIT, INCOME),
            tx("5", "2026-02-12", "65000", DEBIT, EXPENSE),
            tx("6", "2026-02-20", "25000", DEBIT, DEBT_PAYMENT)
        );
    }

    @Test
    void calculatesExpectedCashflow() {

        var result =
            calculator.calculate(fixture(), from, to, months);

        assertEquals("INR", result.currency());
        assertEquals(2, result.completeMonthsAnalyzed());
        assertEquals(6, result.analyzedTransactions());

        assertEquals(new BigDecimal("125000.00"),
            result.averageMonthlyDetectedIncome());

        assertEquals(new BigDecimal("85000.00"),
            result.averageMonthlyOutflows());

        assertEquals(new BigDecimal("25000.00"),
            result.averageMonthlyDebtPayments());

        assertEquals(new BigDecimal("40000.00"),
            result.averageMonthlySustainableNetCashflow());

        assertEquals(new BigDecimal("96.00"),
            result.incomeStabilityPercent());
    }

    @Test
    void excludesInternalTransfers() {

        var rows = new ArrayList<>(fixture());

        rows.add(tx("7", "2026-01-15", "50000",
            CREDIT, INTERNAL_TRANSFER));

        rows.add(tx("8", "2026-02-15", "50000",
            DEBIT, INTERNAL_TRANSFER));

        var result =
            calculator.calculate(rows, from, to, months);

        assertEquals(new BigDecimal("125000.00"),
            result.averageMonthlyDetectedIncome());

        assertEquals(new BigDecimal("85000.00"),
            result.averageMonthlyOutflows());
    }

    @Test
    void excludesRefundsFromSustainableIncome() {

        var rows = new ArrayList<>(fixture());

        rows.add(tx("7", "2026-01-25", "10000",
            CREDIT, REFUND));

        var result =
            calculator.calculate(rows, from, to, months);

        assertEquals(new BigDecimal("40000.00"),
            result.averageMonthlySustainableNetCashflow());

        assertEquals(new BigDecimal("50000"),
            result.monthlyCashflow().get(0).observedNetCashflow());
    }

    @Test
    void removesExactDuplicateTransactions() {

        var rows = new ArrayList<>(fixture());
        rows.add(rows.get(0));

        var result =
            calculator.calculate(rows, from, to, months);

        assertEquals(6, result.analyzedTransactions());

        assertEquals(new BigDecimal("125000.00"),
            result.averageMonthlyDetectedIncome());

        assertFalse(result.warnings().isEmpty());
    }

    @Test
    void rejectsConflictingDuplicates() {

        var rows = new ArrayList<>(fixture());

        rows.add(tx("1", "2026-01-05",
            "999999", CREDIT, INCOME));

        assertThrows(IllegalArgumentException.class,
            () -> calculator.calculate(rows, from, to, months));
    }

    @Test
    void incompleteHistoryDoesNotProduceZeroMetrics() {

        var result = calculator.calculate(
            fixture(), from, to,
            Set.of(YearMonth.of(2026, 1))
        );

        assertNull(result.averageMonthlyDetectedIncome());
        assertNull(result.averageMonthlyDebtPayments());
        assertNull(result.incomeStabilityPercent());
    }

    @Test
    void unclassifiedTransactionsPreventMisleadingMetrics() {

        var rows = new ArrayList<>(fixture());

        rows.add(tx("7", "2026-02-15", "50000",
            CREDIT, UNKNOWN));

        var result =
            calculator.calculate(rows, from, to, months);

        assertNull(result.averageMonthlyDetectedIncome());
        assertNull(result.averageMonthlySustainableNetCashflow());

        assertFalse(result.warnings().isEmpty());
    }

    @Test
    void rejectsNonInrTransactions() {

        var transaction =
            new SetuFinancialSummaryCalculator.Transaction(
                "synthetic-bank",
                "synthetic-account",
                "usd-1",
                from,
                "USD",
                CREDIT,
                new BigDecimal("1000"),
                INCOME
            );

        assertThrows(IllegalArgumentException.class,
            () -> calculator.calculate(
                List.of(transaction), from, to, months));
    }

    @Test
    void emptyHistoryDoesNotProduceFinancialMetrics() {

        var result = calculator.calculate(
            List.of(), from, to, months
        );

        assertEquals(0, result.analyzedTransactions());
        assertNull(result.averageMonthlyDetectedIncome());
        assertNull(result.averageMonthlyOutflows());
        assertNull(result.incomeStabilityPercent());
    }

    @Test
    void rejectsIncorrectTransactionDirection() {

        var rows = List.of(
            tx("1", "2026-01-05", "1000",
                DEBIT, INCOME)
        );

        assertThrows(IllegalArgumentException.class,
            () -> calculator.calculate(rows, from, to, months));
    }
}
