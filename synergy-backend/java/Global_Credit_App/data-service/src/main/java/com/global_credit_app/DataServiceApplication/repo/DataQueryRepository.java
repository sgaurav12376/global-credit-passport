package com.global_credit_app.DataServiceApplication.repo;

import com.global_credit_app.DataServiceApplication.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class DataQueryRepository {
    private final JdbcTemplate jdbc;

    // -----------------------------
    // ACCOUNTS (from unified_transactions)
    // -----------------------------
    public List<AccountDTO> findAccounts(String type, String subtype) {
        var np = new NamedParameterJdbcTemplate(jdbc);
        String sql = """
            WITH last_bal AS (
              SELECT DISTINCT ON (account_id)
                     account_id,
                     balance       AS bal_current,
                     currency,
                     transaction_date
              FROM public.unified_transactions
              WHERE account_id IS NOT NULL
              ORDER BY account_id, transaction_date DESC NULLS LAST
            ),
            ids AS (
              SELECT DISTINCT account_id
              FROM public.unified_transactions
              WHERE account_id IS NOT NULL
            )
            SELECT
              i.account_id                           AS account_id,
              /* friendly mock names for UI */
              CASE
                WHEN i.account_id LIKE '%%1405' THEN 'Everyday Checking'
                WHEN i.account_id LIKE '%%1505' THEN 'Rainy Day Savings'
                WHEN i.account_id LIKE '%%2388' THEN 'Joint Checking'
                WHEN i.account_id LIKE '%%5457' THEN 'Freedom Credit Card'
                WHEN i.account_id LIKE '%%9434' THEN 'Travel Mastercard'
                WHEN i.account_id LIKE '%%9739' THEN 'Personal Loan'
                ELSE CONCAT('Account ', RIGHT(i.account_id, 4))
              END AS name,
              CASE
                WHEN i.account_id LIKE '%%1405' THEN 'Checking'
                WHEN i.account_id LIKE '%%1505' THEN 'Savings'
                WHEN i.account_id LIKE '%%2388' THEN 'Checking'
                WHEN i.account_id LIKE '%%5457' THEN 'Credit'
                WHEN i.account_id LIKE '%%9434' THEN 'Credit'
                WHEN i.account_id LIKE '%%9739' THEN 'Loan'
                ELSE 'Other'
              END AS account_type,
              CASE
                WHEN i.account_id LIKE '%%5457' THEN 'credit card'
                WHEN i.account_id LIKE '%%9434' THEN 'credit card'
                WHEN i.account_id LIKE '%%9739' THEN 'installment loan'
                ELSE 'depository'
              END AS account_subtype,
              'personal' AS holder_category,
              NULL::numeric AS bal_available,
              lb.bal_current AS bal_current,
              CASE
                WHEN i.account_id LIKE '%%5457' THEN 6000
                WHEN i.account_id LIKE '%%9434' THEN 8000
                ELSE NULL
              END AS credit_limit,
              COALESCE(lb.currency, 'INR') AS currency,
              NULL::text AS institution_id,
              NULL::text AS institution_name
            FROM ids i
            LEFT JOIN last_bal lb ON lb.account_id = i.account_id
            ORDER BY i.account_id
            """;

        return np.query(sql, new MapSqlParameterSource(), (rs, i) -> new AccountDTO(
                rs.getString("account_id"),
                rs.getString("name"),
                null,
                rs.getString("account_type"),
                rs.getString("account_subtype"),
                rs.getString("holder_category"),
                rs.getBigDecimal("bal_available"),
                rs.getBigDecimal("bal_current"),
                rs.getBigDecimal("credit_limit"),
                rs.getString("currency"),
                rs.getString("institution_id"),
                rs.getString("institution_name")
        ));
    }

    // -----------------------------
    // UTILIZATION — from existing tables:
    //   - credit_limit from public.customer_details (credit accounts)
    //   - latest balance per account from public.unified_transactions
    // Returns (summary + per-line) for the UI.
    // -----------------------------

    private static final String UTIL_SUMMARY_SQL = """
        WITH cd AS (
          SELECT
            COALESCE(
              to_jsonb(cd)->>'account_id',
              to_jsonb(cd)->>'accountId',
              to_jsonb(cd)->>'acct_id',
              to_jsonb(cd)->>'account_number'
            )::text                                  AS account_id,
            lower(to_jsonb(cd)->>'account_type')     AS account_type,
            (to_jsonb(cd)->>'current_balance')::numeric   AS bal_current,
            (to_jsonb(cd)->>'available_balance')::numeric AS bal_available,
            (to_jsonb(cd)->>'credit_limit')::numeric      AS credit_limit
          FROM public.customer_details cd
        ),
        credit_only AS (
          SELECT *
          FROM cd
          WHERE account_type = 'credit'
            AND credit_limit IS NOT NULL AND credit_limit > 0
            AND account_id IS NOT NULL
        ),
        last_bal AS (
          SELECT DISTINCT ON (ut.account_id)
                 ut.account_id,
                 COALESCE(ut.balance,0)::numeric AS bal_current
          FROM public.unified_transactions ut
          JOIN credit_only c ON c.account_id = ut.account_id
          WHERE ut.account_id IS NOT NULL
          ORDER BY ut.account_id, ut.transaction_date DESC NULLS LAST
        ),
        joined AS (
          SELECT c.account_id,
                 c.credit_limit,
                 COALESCE(lb.bal_current, c.bal_current, 0) AS bal_current,
                 c.bal_available
          FROM credit_only c
          LEFT JOIN last_bal lb USING (account_id)
        )
        SELECT
          SUM(bal_current)::numeric                                         AS current_balance,
          SUM(credit_limit)::numeric                                        AS overall_limit,
          SUM(COALESCE(bal_available, GREATEST(credit_limit - bal_current,0)))::numeric
                                                                            AS available_credit,
          CASE WHEN SUM(credit_limit) > 0
               THEN ROUND(SUM(bal_current) / SUM(credit_limit) * 100, 2)
               ELSE NULL END                                                AS utilization_percent
        FROM joined
        """;

    private static final String UTIL_LINES_SQL = """
        WITH cd AS (
          SELECT
            COALESCE(
              to_jsonb(cd)->>'account_id',
              to_jsonb(cd)->>'accountId',
              to_jsonb(cd)->>'acct_id',
              to_jsonb(cd)->>'account_number'
            )::text                                  AS account_id,
            COALESCE(
              to_jsonb(cd)->>'account_name',
              to_jsonb(cd)->>'official_name',
              to_jsonb(cd)->>'officialName',
              to_jsonb(cd)->>'institution_name',
              to_jsonb(cd)->>'institutionName',
              to_jsonb(cd)->>'account_number'
            )                                        AS name,
            lower(to_jsonb(cd)->>'account_type')     AS account_type,
            (to_jsonb(cd)->>'credit_limit')::numeric      AS credit_limit,
            (to_jsonb(cd)->>'current_balance')::numeric   AS bal_current,
            NULL::numeric                               AS apr,
            NULL::date                                  AS opened_at,
            NULL::date                                  AS last_statement_at,
            NULL::date                                  AS next_due_at,
            COALESCE(
              to_jsonb(cd)->>'currency_code',
              to_jsonb(cd)->>'currency',
              'USD'
            )                                        AS currency
          FROM public.customer_details cd
        ),
        credit_only AS (
          SELECT * FROM cd
          WHERE account_type = 'credit'
            AND credit_limit IS NOT NULL AND credit_limit > 0
            AND account_id IS NOT NULL
        ),
        lb AS (
          SELECT DISTINCT ON (ut.account_id)
                 ut.account_id,
                 COALESCE(ut.balance,0)::numeric AS bal_current
          FROM public.unified_transactions ut
          JOIN credit_only c ON c.account_id = ut.account_id
          WHERE ut.account_id IS NOT NULL
          ORDER BY ut.account_id, ut.transaction_date DESC NULLS LAST
        )
        SELECT
          c.account_id,
          COALESCE(c.name, c.account_id)                                   AS name,
          COALESCE(lb.bal_current, c.bal_current, 0)                       AS balance,
          c.credit_limit                                                   AS credit_limit,
          CASE WHEN c.credit_limit > 0
               THEN ROUND(COALESCE(lb.bal_current, c.bal_current, 0) / c.credit_limit * 100, 2)
               ELSE NULL END                                               AS utilization_percent,
          c.apr,
          c.opened_at,
          c.last_statement_at,
          c.next_due_at,
          c.currency
        FROM credit_only c
        LEFT JOIN lb USING (account_id)
        ORDER BY utilization_percent DESC NULLS LAST, name
        """;

    private UtilizationDTO mapSummary(ResultSet rs) throws SQLException {
        BigDecimal cur = rs.getBigDecimal("current_balance");
        BigDecimal lim = rs.getBigDecimal("overall_limit");
        BigDecimal avail = rs.getBigDecimal("available_credit");
        BigDecimal pct = rs.getBigDecimal("utilization_percent");
        return new UtilizationDTO(pct, cur, avail, lim);
    }

    private UtilizationLineDTO mapLine(ResultSet rs) throws SQLException {
        return new UtilizationLineDTO(
                rs.getString("account_id"),
                rs.getString("name"),
                rs.getBigDecimal("balance"),
                rs.getBigDecimal("credit_limit"),
                rs.getBigDecimal("utilization_percent"),
                rs.getBigDecimal("apr"),
                rs.getObject("opened_at", java.time.LocalDate.class),
                rs.getObject("last_statement_at", java.time.LocalDate.class),
                rs.getObject("next_due_at", java.time.LocalDate.class),
                rs.getString("currency")
        );
    }

    public UtilizationDTO getUtilizationSummaryFromExistingTables() {
        return jdbc.queryForObject(UTIL_SUMMARY_SQL, (rs, rowNum) -> mapSummary(rs));
    }

    public List<UtilizationLineDTO> getUtilizationLinesFromExistingTables() {
        return jdbc.query(UTIL_LINES_SQL, (rs, rowNum) -> mapLine(rs));
    }

    /** Main entry used by the service/controller */
    public UtilizationResponseDTO getRevolvingUtilization() {
        UtilizationDTO summary = getUtilizationSummaryFromExistingTables();
        List<UtilizationLineDTO> lines = getUtilizationLinesFromExistingTables();
        return new UtilizationResponseDTO(summary, lines);
    }

    // -----------------------------
    // ACCOUNT MIX (from unified_transactions)
    // -----------------------------
    public AccountMixResponseDTO getAccountMix() {
        var rows = jdbc.query("""
            WITH tx AS (
              SELECT
                account_id,
                ABS(COALESCE(amount,0)) AS amt,
                COALESCE(category_primary, transaction_type, 'Uncategorized') AS category
              FROM public.unified_transactions
              WHERE account_id IS NOT NULL
            ),
            per_cat AS (
              SELECT category,
                     COUNT(DISTINCT account_id) AS accounts,
                     SUM(amt)                   AS exposure
              FROM tx
              GROUP BY category
            ),
            totals AS (
              SELECT
                (SELECT COUNT(DISTINCT account_id) FROM public.unified_transactions WHERE account_id IS NOT NULL) AS total_accounts,
                (SELECT SUM(ABS(COALESCE(amount,0))) FROM public.unified_transactions) AS total_exposure
            ),
            shares AS (
              SELECT p.category, p.accounts, p.exposure,
                     t.total_accounts, t.total_exposure,
                     CASE WHEN t.total_exposure>0 THEN p.exposure / t.total_exposure ELSE NULL END AS exposure_share
              FROM per_cat p CROSS JOIN totals t
            ),
            hhi AS (SELECT SUM(POWER(COALESCE(exposure_share,0),2))::numeric AS hhi FROM shares)
            SELECT s.category, s.accounts, s.exposure,
                   s.total_accounts, s.total_exposure, s.exposure_share, h.hhi
            FROM shares s CROSS JOIN hhi h
            ORDER BY s.exposure DESC NULLS LAST, s.category
            """, (rs, i) -> new Object[] {
                rs.getString("category"),
                rs.getInt("accounts"),
                rs.getBigDecimal("exposure"),
                rs.getInt("total_accounts"),
                rs.getBigDecimal("total_exposure"),
                rs.getBigDecimal("exposure_share"),
                rs.getBigDecimal("hhi")
        });

        int totalAccounts = rows.isEmpty() ? 0 : (Integer) rows.get(0)[3];
        BigDecimal totalExposure = rows.isEmpty() ? BigDecimal.ZERO : (BigDecimal) rows.get(0)[4];
        BigDecimal diversityIndex = rows.isEmpty() ? BigDecimal.ZERO : (BigDecimal) rows.get(0)[6];

        var entries = new ArrayList<AccountMixEntryDTO>();
        for (var r : rows) {
            entries.add(new AccountMixEntryDTO(
                    (String) r[0],
                    (Integer) r[1],
                    (BigDecimal) r[2],
                    (BigDecimal) r[5]
            ));
        }

        return new AccountMixResponseDTO(totalAccounts, totalExposure, diversityIndex, entries);
    }

    // -----------------------------
    // ACTIVE ACCOUNTS (90d)
    // -----------------------------
    public ActiveAccountsDTO getActiveAccounts() {
        return jdbc.queryForObject("""
            WITH recent AS (
              SELECT *
              FROM public.unified_transactions
              WHERE transaction_date >= CURRENT_DATE - INTERVAL '90 days'
            )
            SELECT COUNT(DISTINCT account_id) AS active_accounts,
                   SUM(ABS(COALESCE(amount,0)))::numeric AS total_exposure
            FROM recent
            """, (rs, i) -> new ActiveAccountsDTO(
                rs.getInt("active_accounts"),
                rs.getBigDecimal("total_exposure")
        ));
    }

    // -----------------------------
    // GLOBAL SCORE (placeholder)
    // -----------------------------
    public GlobalScoreDTO getGlobalScore() {
        return new GlobalScoreDTO(0, "N/A");
    }

    // -----------------------------
    // CREDIT AGE (from dates in unified_transactions)
    // -----------------------------
    public CreditAgeDTO getCreditAge() {
        return jdbc.queryForObject("""
            WITH bounds AS (
              SELECT MIN(transaction_date) AS min_d, MAX(transaction_date) AS max_d
              FROM public.unified_transactions
              WHERE transaction_date IS NOT NULL
            ),
            months_overall AS (
              SELECT
                (EXTRACT(YEAR FROM age(max_d, min_d))::int * 12
               + EXTRACT(MONTH FROM age(max_d, min_d))::int)::numeric AS months_span
              FROM bounds
            ),
            per_acct AS (
              SELECT account_id, MIN(transaction_date) AS min_d, MAX(transaction_date) AS max_d
              FROM public.unified_transactions
              WHERE account_id IS NOT NULL AND transaction_date IS NOT NULL
              GROUP BY account_id
            ),
            per_acct_months AS (
              SELECT
                account_id,
                (EXTRACT(YEAR FROM age(max_d, min_d))::int * 12
               + EXTRACT(MONTH FROM age(max_d, min_d))::int)::numeric AS months_span
              FROM per_acct
            )
            SELECT
              COALESCE((SELECT months_span FROM months_overall), 0)::int AS oldest_months,
              COALESCE((SELECT AVG(months_span) FROM per_acct_months), 0)::numeric AS avg_months
            """, (rs, i) -> new CreditAgeDTO(
                rs.getInt("oldest_months"),
                rs.getBigDecimal("avg_months")
        ));
    }

    // -----------------------------
    // PAYMENT HISTORY (placeholder)
    // -----------------------------
    public PaymentHistoryDTO getPaymentHistory() {
        return new PaymentHistoryDTO(0, 0, 0, 0, 0, null);
    }


}
