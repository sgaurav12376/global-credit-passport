package com.synergyresources.gcp.passport.setu;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.function.Function;

public final class SetuFinancialSummaryCalculator {

    public static final String METHODOLOGY_VERSION =
        "SETU_CASHFLOW_DRAFT_V1";

    public enum Category {
        INCOME,
        INTEREST,
        EXPENSE,
        DEBT_PAYMENT,
        INTERNAL_TRANSFER,
        REFUND,
        UNKNOWN
    }

    public enum Direction {
        CREDIT,
        DEBIT
    }

    public record Transaction(
        String institutionId,
        String accountId,
        String transactionId,
        LocalDate date,
        String currency,
        Direction direction,
        BigDecimal amount,
        Category category
    ) {}

    public record MonthlyCashflow(
        YearMonth month,
        int transactionCount,
        BigDecimal detectedIncome,
        BigDecimal interestIncome,
        BigDecimal refundsOtherCredits,
        BigDecimal totalOutflows,
        BigDecimal debtPayments,
        BigDecimal sustainableNetCashflow,
        BigDecimal observedNetCashflow
    ) {}

    public record FinancialSummary(
        String methodologyVersion,
        String currency,
        int institutionConnections,
        int depositoryAccounts,
        int analyzedTransactions,
        LocalDate coverageStart,
        LocalDate coverageEnd,
        int completeMonthsAnalyzed,
        BigDecimal averageMonthlyDetectedIncome,
        BigDecimal averageMonthlyOutflows,
        BigDecimal averageMonthlyDebtPayments,
        BigDecimal averageMonthlySustainableNetCashflow,
        BigDecimal incomeStabilityPercent,
        List<MonthlyCashflow> monthlyCashflow,
        List<String> warnings
    ) {}

    private record TransactionKey(
        String institutionId,
        String accountId,
        String transactionId
    ) {}

    private record AccountKey(
        String institutionId,
        String accountId
    ) {}

    public FinancialSummary calculate(
        List<Transaction> transactions,
        LocalDate coverageStart,
        LocalDate coverageEnd,
        Set<YearMonth> confirmedCompleteMonths
    ) {
        Objects.requireNonNull(transactions);
        Objects.requireNonNull(coverageStart);
        Objects.requireNonNull(coverageEnd);
        Objects.requireNonNull(confirmedCompleteMonths);

        if (coverageStart.isAfter(coverageEnd)) {
            throw new IllegalArgumentException(
                "Invalid observation period"
            );
        }

        Map<TransactionKey, Transaction> unique =
            new LinkedHashMap<>();

        for (Transaction tx : transactions) {

            validate(tx, coverageStart, coverageEnd);

            TransactionKey key = new TransactionKey(
                tx.institutionId(),
                tx.accountId(),
                tx.transactionId()
            );

            Transaction previous =
                unique.putIfAbsent(key, tx);

            if (previous != null && !previous.equals(tx)) {
                throw new IllegalArgumentException(
                    "Conflicting duplicate transaction"
                );
            }
        }

        List<Transaction> eligible =
            List.copyOf(unique.values());

        List<String> warnings = new ArrayList<>();

        if (eligible.size() != transactions.size()) {
            warnings.add("Duplicate transactions removed");
        }

        Map<YearMonth, List<Transaction>> grouped =
            new TreeMap<>();

        for (Transaction tx : eligible) {
            grouped.computeIfAbsent(
                YearMonth.from(tx.date()),
                key -> new ArrayList<>()
            ).add(tx);
        }

        List<MonthlyCashflow> complete = new ArrayList<>();

        for (YearMonth month :
                new TreeSet<>(confirmedCompleteMonths)) {

            if (month.atDay(1).isBefore(coverageStart)
                || month.atEndOfMonth().isAfter(coverageEnd)) {

                throw new IllegalArgumentException(
                    "Complete month outside observation period"
                );
            }

            List<Transaction> rows = grouped.get(month);

            if (rows == null || rows.isEmpty()) {
                warnings.add(
                    "No transaction rows for " + month
                );
                continue;
            }

            if (rows.stream().anyMatch(
                    tx -> tx.category() == Category.UNKNOWN)) {

                warnings.add(
                    "Unclassified transactions in " + month
                );
                continue;
            }

            complete.add(summarize(month, rows));
        }

        if (complete.size() < 2) {
            warnings.add(
                "Fewer than two usable complete months"
            );
        }

        // Conservative pilot rule: do not publish averages
        // if any expected complete month is unusable.
        boolean sufficient =
            complete.size() >= 2
            && complete.size() == confirmedCompleteMonths.size();

        return new FinancialSummary(
            METHODOLOGY_VERSION,
            "INR",
            (int) eligible.stream()
                .map(Transaction::institutionId)
                .distinct().count(),
            (int) eligible.stream()
                .map(tx -> new AccountKey(
                    tx.institutionId(), tx.accountId()))
                .distinct().count(),
            eligible.size(),
            coverageStart,
            coverageEnd,
            complete.size(),
            sufficient
                ? average(complete, MonthlyCashflow::detectedIncome)
                : null,
            sufficient
                ? average(complete, MonthlyCashflow::totalOutflows)
                : null,
            sufficient
                ? average(complete, MonthlyCashflow::debtPayments)
                : null,
            sufficient
                ? average(complete, MonthlyCashflow::sustainableNetCashflow)
                : null,
            sufficient ? stability(complete) : null,
            List.copyOf(complete),
            List.copyOf(warnings)
        );
    }

    private void validate(
        Transaction tx,
        LocalDate from,
        LocalDate to
    ) {
        Objects.requireNonNull(tx);

        if (blank(tx.institutionId())
            || blank(tx.accountId())
            || blank(tx.transactionId())
            || tx.date() == null
            || tx.amount() == null
            || tx.amount().signum() <= 0
            || tx.category() == null
            || tx.direction() == null) {

            throw new IllegalArgumentException(
                "Invalid financial transaction"
            );
        }

        if (!"INR".equals(tx.currency())) {
            throw new IllegalArgumentException(
                "Only INR is supported by this pilot calculator"
            );
        }

        if (tx.date().isBefore(from)
            || tx.date().isAfter(to)) {

            throw new IllegalArgumentException(
                "Transaction outside observation period"
            );
        }

        boolean invalidDirection = switch (tx.category()) {
            case INCOME, INTEREST, REFUND ->
                tx.direction() != Direction.CREDIT;
            case EXPENSE, DEBT_PAYMENT ->
                tx.direction() != Direction.DEBIT;
            default -> false;
        };

        if (invalidDirection) {
            throw new IllegalArgumentException(
                "Transaction direction conflicts with category"
            );
        }
    }

    private boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private MonthlyCashflow summarize(
        YearMonth month,
        List<Transaction> transactions
    ) {
        BigDecimal income = sum(transactions, Category.INCOME);
        BigDecimal interest = sum(transactions, Category.INTEREST);
        BigDecimal refunds = sum(transactions, Category.REFUND);
        BigDecimal expenses = sum(transactions, Category.EXPENSE);
        BigDecimal debt = sum(transactions, Category.DEBT_PAYMENT);

        BigDecimal outflows = expenses.add(debt);

        BigDecimal sustainable =
            income.add(interest).subtract(outflows);

        return new MonthlyCashflow(
            month,
            transactions.size(),
            income,
            interest,
            refunds,
            outflows,
            debt,
            sustainable,
            sustainable.add(refunds)
        );
    }

    private BigDecimal sum(
        List<Transaction> rows,
        Category category
    ) {
        return rows.stream()
            .filter(tx -> tx.category() == category)
            .map(Transaction::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal average(
        List<MonthlyCashflow> months,
        Function<MonthlyCashflow, BigDecimal> metric
    ) {
        return months.stream()
            .map(metric)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .divide(
                BigDecimal.valueOf(months.size()),
                2,
                RoundingMode.HALF_UP
            );
    }

    private BigDecimal stability(List<MonthlyCashflow> months) {

        if (months.size() < 2) return null;

        double[] values = months.stream()
            .mapToDouble(m -> m.detectedIncome().doubleValue())
            .toArray();

        double mean =
            Arrays.stream(values).average().orElse(0);

        if (mean <= 0) return null;

        double variance = Arrays.stream(values)
            .map(value -> Math.pow(value - mean, 2))
            .average().orElse(0);

        double result = Math.max(
            0, Math.min(
                100, 100 * (1 - Math.sqrt(variance) / mean)
            )
        );

        return BigDecimal.valueOf(result)
            .setScale(2, RoundingMode.HALF_UP);
    }
}
