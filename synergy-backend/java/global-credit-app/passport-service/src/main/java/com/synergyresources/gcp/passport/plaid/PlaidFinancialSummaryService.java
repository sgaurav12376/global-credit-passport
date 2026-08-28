package com.synergyresources.gcp.passport.plaid;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlaidFinancialSummaryService {
  private final JdbcTemplate jdbcTemplate;

  public PlaidFinancialSummaryService(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Transactional(readOnly = true)
  public FinancialSummary getSummary(UUID borrowerId) {
    return getSummary(borrowerId, null);
  }

  @Transactional(readOnly = true)
  public FinancialSummary getSummary(UUID borrowerId, List<String> itemIds) {
    if (itemIds != null && itemIds.isEmpty()) {
      throw new IllegalArgumentException("At least one Plaid item is required");
    }
    Coverage coverage = loadCoverage(borrowerId, itemIds);
    List<MonthlyCashflow> monthly = loadMonthly(borrowerId, coverage, itemIds);
    List<MonthlyCashflow> completeMonths = monthly.stream()
        .filter(MonthlyCashflow::completeMonth)
        .toList();

    BigDecimal averageIncome = average(completeMonths, MonthlyCashflow::detectedIncome);
    BigDecimal averageInterest = average(completeMonths, MonthlyCashflow::interestIncome);
    BigDecimal averageRefunds = average(completeMonths, MonthlyCashflow::refundsOtherCredits);
    BigDecimal averageOutflows = average(completeMonths, MonthlyCashflow::totalOutflows);
    BigDecimal averageDebt = average(completeMonths, MonthlyCashflow::debtPayments);
    BigDecimal sustainableNet = averageIncome.add(averageInterest).subtract(averageOutflows);
    BigDecimal observedNet = sustainableNet.add(averageRefunds);

    return new FinancialSummary(
        borrowerId,
        coverage.institutionConnections(),
        coverage.accounts(),
        coverage.transactions(),
        coverage.coverageStart(),
        coverage.coverageEnd(),
        monthly.size(),
        completeMonths.size(),
        monthly.size() - completeMonths.size(),
        averageIncome,
        averageInterest,
        averageRefunds,
        averageOutflows,
        averageDebt,
        sustainableNet,
        observedNet,
        incomeStability(completeMonths),
        monthly
    );
  }

  private Coverage loadCoverage(UUID borrowerId, List<String> itemIds) {
    String itemFilter = itemFilter("pt.item_id", itemIds);
    List<Object> parameters = parameters(borrowerId, itemIds);
    return jdbcTemplate.queryForObject("""
        SELECT
          COUNT(DISTINCT pt.item_id) AS institution_connections,
          COUNT(DISTINCT (pt.item_id, pt.account_id)) AS accounts,
          COUNT(*) AS transactions,
          MIN(pt.transaction_date) AS coverage_start,
          MAX(pt.transaction_date) AS coverage_end
        FROM plaid_transactions pt
        JOIN plaid_accounts pa
          ON pa.item_id = pt.item_id
         AND pa.account_id = pt.account_id
        WHERE pt.borrower_id = ?
          AND pt.active
          AND pt.transaction_date IS NOT NULL
          AND pa.account_type = 'depository'
        """ + itemFilter,
        (resultSet, rowNumber) -> new Coverage(
            resultSet.getInt("institution_connections"),
            resultSet.getInt("accounts"),
            resultSet.getInt("transactions"),
            localDate(resultSet.getDate("coverage_start")),
            localDate(resultSet.getDate("coverage_end"))
        ), parameters.toArray()
    );
  }

  private List<MonthlyCashflow> loadMonthly(
      UUID borrowerId, Coverage coverage, List<String> itemIds
  ) {
    LocalDate firstBoundary = coverage.coverageStart() == null
        ? null
        : coverage.coverageStart().withDayOfMonth(1);
    LocalDate lastBoundary = coverage.coverageEnd() == null
        ? null
        : coverage.coverageEnd().withDayOfMonth(1);

    String source = itemIds == null
        ? "plaid_monthly_cashflow"
        : "plaid_monthly_cashflow_by_item";
    String itemFilter = itemFilter("item_id", itemIds);
    List<Object> parameters = parameters(borrowerId, itemIds);
    String sql = """
        SELECT
          month,
          SUM(transaction_count) AS transaction_count,
          SUM(detected_income) AS detected_income,
          SUM(interest_income) AS interest_income,
          SUM(refunds_other_credits) AS refunds_other_credits,
          SUM(total_outflows) AS total_outflows,
          SUM(debt_payments) AS debt_payments
        FROM %s
        WHERE borrower_id = ?
        %s
        GROUP BY month
        ORDER BY month
        """.formatted(source, itemFilter);
    return jdbcTemplate.query(sql,
        (resultSet, rowNumber) -> {
          LocalDate month = resultSet.getDate("month").toLocalDate();
          BigDecimal income = resultSet.getBigDecimal("detected_income");
          BigDecimal interest = resultSet.getBigDecimal("interest_income");
          BigDecimal refunds = resultSet.getBigDecimal("refunds_other_credits");
          BigDecimal outflows = resultSet.getBigDecimal("total_outflows");
          boolean complete = firstBoundary != null
              && lastBoundary != null
              && month.isAfter(firstBoundary)
              && month.isBefore(lastBoundary);

          return new MonthlyCashflow(
              month,
              complete,
              resultSet.getInt("transaction_count"),
              income,
              interest,
              refunds,
              outflows,
              resultSet.getBigDecimal("debt_payments"),
              income.add(interest).subtract(outflows),
              income.add(interest).add(refunds).subtract(outflows)
          );
        }, parameters.toArray()
    );
  }

  private String itemFilter(String column, List<String> itemIds) {
    if (itemIds == null) return "";
    return " AND " + column + " IN (" + String.join(",", java.util.Collections.nCopies(
        itemIds.size(), "?"
    )) + ")";
  }

  private List<Object> parameters(UUID borrowerId, List<String> itemIds) {
    List<Object> values = new java.util.ArrayList<>();
    values.add(borrowerId);
    if (itemIds != null) values.addAll(itemIds);
    return values;
  }

  private BigDecimal average(
      List<MonthlyCashflow> months,
      java.util.function.Function<MonthlyCashflow, BigDecimal> value
  ) {
    if (months.isEmpty()) return BigDecimal.ZERO;
    BigDecimal total = months.stream()
        .map(value)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
    return total.divide(BigDecimal.valueOf(months.size()), 2, RoundingMode.HALF_UP);
  }

  private BigDecimal incomeStability(List<MonthlyCashflow> months) {
    if (months.size() < 2) return null;
    double[] income = months.stream()
        .mapToDouble(month -> month.detectedIncome().doubleValue())
        .toArray();
    double mean = java.util.Arrays.stream(income).average().orElse(0);
    if (mean <= 0) return null;
    double variance = java.util.Arrays.stream(income)
        .map(value -> Math.pow(value - mean, 2))
        .average()
        .orElse(0);
    double stability = Math.max(0, Math.min(100, 100 * (1 - Math.sqrt(variance) / mean)));
    return BigDecimal.valueOf(stability).setScale(2, RoundingMode.HALF_UP);
  }

  private static LocalDate localDate(Date date) {
    return date == null ? null : date.toLocalDate();
  }

  private record Coverage(
      int institutionConnections,
      int accounts,
      int transactions,
      LocalDate coverageStart,
      LocalDate coverageEnd
  ) {
  }

  public record MonthlyCashflow(
      LocalDate month,
      boolean completeMonth,
      int transactionCount,
      BigDecimal detectedIncome,
      BigDecimal interestIncome,
      BigDecimal refundsOtherCredits,
      BigDecimal totalOutflows,
      BigDecimal debtPayments,
      BigDecimal sustainableNetCashflow,
      BigDecimal observedNetCashflow
  ) {
  }

  public record FinancialSummary(
      UUID borrowerId,
      int institutionConnections,
      int depositoryAccounts,
      int analyzedTransactions,
      LocalDate coverageStart,
      LocalDate coverageEnd,
      int calendarMonthsObserved,
      int completeMonthsAnalyzed,
      int partialMonthsExcluded,
      BigDecimal averageMonthlyDetectedIncome,
      BigDecimal averageMonthlyInterestIncome,
      BigDecimal averageMonthlyRefundsOtherCredits,
      BigDecimal averageMonthlyOutflows,
      BigDecimal averageMonthlyDebtPayments,
      BigDecimal averageMonthlySustainableNetCashflow,
      BigDecimal averageMonthlyObservedNetCashflow,
      BigDecimal incomeStabilityPercent,
      List<MonthlyCashflow> monthlyCashflow
  ) {
  }
}
