package com.global_credit_app.DataServiceApplication.repo;

import com.global_credit_app.DataServiceApplication.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.util.ArrayList;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class DataQueryRepository {
    private final JdbcTemplate jdbc;

    /**
     * ACCOUNTS -> public.customer_details
     */
    public List<AccountDTO> findAccounts(String type, String subtype) {
        var np = new NamedParameterJdbcTemplate(jdbc);

        String sql = """
            SELECT
              account_number                         AS account_id,
              account_name                           AS name,
              NULL::text                             AS official_name,
              account_type,
              account_subtype,
              NULL::text                             AS holder_category,
              available_balance                      AS bal_available,
              current_balance                        AS bal_current,
              credit_limit,
              currency_code                          AS currency,
              NULL::text                             AS institution_id,
              NULL::text                             AS institution_name
            FROM public.customer_details
            WHERE (:type IS NULL OR account_type = :type)
              AND (:subtype IS NULL OR account_subtype = :subtype)
            ORDER BY account_type NULLS LAST, account_subtype NULLS LAST, account_name NULLS LAST
        """;

        var params = new MapSqlParameterSource()
                .addValue("type", type, Types.VARCHAR)
                .addValue("subtype", subtype, Types.VARCHAR);

        return np.query(sql, params, (rs, i) -> new AccountDTO(
                rs.getString("account_id"),
                rs.getString("name"),
                rs.getString("official_name"),
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

    /**
     * UTILIZATION -> public.customer_details
     * Treat account_type='credit' as revolving; adjust if you have a better flag.
     */
    public UtilizationDTO getRevolvingUtilization() {
        var rows = jdbc.query("""
            WITH credit_accts AS (
              SELECT current_balance, credit_limit
              FROM public.customer_details
              WHERE account_type = 'credit'
                AND credit_limit IS NOT NULL
                AND credit_limit > 0
            )
            SELECT CASE
                     WHEN SUM(credit_limit) > 0
                       THEN (SUM(COALESCE(current_balance,0)) / SUM(credit_limit)) * 100
                     ELSE NULL
                   END AS utilization_percent
            FROM credit_accts
        """, (rs, i) -> new UtilizationDTO(rs.getBigDecimal("utilization_percent")));
        return rows.isEmpty() ? new UtilizationDTO(null) : rows.get(0);
    }

    /**
     * ACCOUNT MIX -> public.plaid_transaction_data
     */
    public AccountMixResponseDTO getAccountMix() {
        var rows = jdbc.query("""
            WITH tx AS (
              SELECT
                account_id,
                ABS(COALESCE(amount,0)) AS amt,
                COALESCE(personal_finance_category_primary,
                         transaction_type,
                         'Uncategorized')     AS category
              FROM public.plaid_transaction_data
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
                (SELECT COUNT(DISTINCT account_id) FROM public.plaid_transaction_data) AS total_accounts,
                (SELECT SUM(ABS(COALESCE(amount,0))) FROM public.plaid_transaction_data) AS total_exposure
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
        """, (rs, i) -> new Object[]{
                rs.getString("category"),
                rs.getInt("accounts"),
                rs.getBigDecimal("exposure"),
                rs.getInt("total_accounts"),
                rs.getBigDecimal("total_exposure"),
                rs.getBigDecimal("exposure_share"),
                rs.getBigDecimal("hhi")
        });

        int totalAccounts = rows.isEmpty() ? 0 : (Integer) rows.get(0)[3];
        var totalExposure = rows.isEmpty() ? java.math.BigDecimal.ZERO : (java.math.BigDecimal) rows.get(0)[4];
        var diversityIndex = rows.isEmpty() ? java.math.BigDecimal.ZERO : (java.math.BigDecimal) rows.get(0)[6];

        var entries = new ArrayList<AccountMixEntryDTO>();
        for (var r : rows) {
            entries.add(new AccountMixEntryDTO(
                    (String) r[0],
                    (Integer) r[1],
                    (java.math.BigDecimal) r[2],
                    (java.math.BigDecimal) r[5]
            ));
        }
        return new AccountMixResponseDTO(totalAccounts, totalExposure, diversityIndex, entries);
    }

    /**
     * ACTIVE ACCOUNTS -> last 90 days in plaid_transaction_data
     */
    public ActiveAccountsDTO getActiveAccounts() {
        return jdbc.queryForObject("""
            WITH recent AS (
              SELECT *
              FROM public.plaid_transaction_data
              WHERE date >= CURRENT_DATE - INTERVAL '90 days'
            )
            SELECT COUNT(DISTINCT account_id) AS active_accounts,
                   SUM(ABS(COALESCE(amount,0)))::numeric AS total_exposure
            FROM recent
        """, (rs, i) -> new ActiveAccountsDTO(
                rs.getInt("active_accounts"),
                rs.getBigDecimal("total_exposure")
        ));
    }

    /**
     * GLOBAL SCORE -> public.indian_credit_data
     * Use the LATEST score per person (if report_order_time exists), else average all rows.
     */
    public GlobalScoreDTO getGlobalScore() {
        return jdbc.queryForObject("""
            WITH have_time AS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='indian_credit_data' AND column_name='report_order_time'
              LIMIT 1
            ),
            latest AS (
              SELECT
                CASE WHEN EXISTS (SELECT 1 FROM have_time)
                     THEN (
                       SELECT ROUND(AVG(credit_score))::int
                       FROM (
                         SELECT DISTINCT ON (full_name)
                                full_name, credit_score
                         FROM public.indian_credit_data
                         WHERE credit_score IS NOT NULL
                         ORDER BY full_name, report_order_time DESC NULLS LAST
                       ) x
                     )
                     ELSE (
                       SELECT ROUND(AVG(credit_score))::int
                       FROM public.indian_credit_data
                       WHERE credit_score IS NOT NULL
                     )
                END AS avg_score
            )
            SELECT
              avg_score AS global_score,
              CASE
                WHEN avg_score >= 800 THEN 'Excellent'
                WHEN avg_score >= 750 THEN 'Very Good'
                WHEN avg_score >= 700 THEN 'Good'
                WHEN avg_score >= 650 THEN 'Fair'
                ELSE 'Poor'
              END AS band
            FROM latest
        """, (rs, i) -> new GlobalScoreDTO(
                rs.getInt("global_score"),
                rs.getString("band")
        ));
    }

    /**
     * CREDIT AGE -> plaid_transaction_data
     */
    public CreditAgeDTO getCreditAge() {
        return jdbc.queryForObject("""
            WITH bounds AS (
              SELECT MIN(date) AS min_d, MAX(date) AS max_d
              FROM public.plaid_transaction_data
              WHERE date IS NOT NULL
            ),
            months_overall AS (
              SELECT
                (EXTRACT(YEAR FROM age(max_d, min_d))::int * 12
               + EXTRACT(MONTH FROM age(max_d, min_d))::int)::numeric AS months_span
              FROM bounds
            ),
            per_acct AS (
              SELECT account_id, MIN(date) AS min_d, MAX(date) AS max_d
              FROM public.plaid_transaction_data
              WHERE account_id IS NOT NULL AND date IS NOT NULL
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

    /**
     * PAYMENT HISTORY -> placeholder
     */
    public PaymentHistoryDTO getPaymentHistory() {
        return new PaymentHistoryDTO(0, 0, 0, 0, 0, null);
    }
}
