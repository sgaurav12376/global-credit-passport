package com.global_credit_app.DataServiceApplication.repo;

import com.global_credit_app.DataServiceApplication.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import java.sql.Types;
import java.time.LocalDate;
import java.util.*;

@Repository
@RequiredArgsConstructor
public class DataQueryRepository {
    private final JdbcTemplate jdbc;

    public List<AccountDTO> findAccounts(String type, String subtype) {
        var np = new NamedParameterJdbcTemplate(jdbc);
        String sql = """
      SELECT account_id, name, official_name, account_type, account_subtype, holder_category,
             bal_available, bal_current, credit_limit, currency, institution_id, institution_name
      FROM analytics.vw_accounts
      WHERE (:type IS NULL OR account_type = :type)
        AND (:subtype IS NULL OR account_subtype = :subtype)
      ORDER BY account_type, account_subtype, name
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


    public UtilizationDTO getRevolvingUtilization() {
        List<UtilizationDTO> rows = jdbc.query(
                "SELECT utilization_percent FROM analytics.vw_revolving_utilization",
                (rs, i) -> new UtilizationDTO(rs.getBigDecimal(1))
        );
        return rows.isEmpty() ? new UtilizationDTO(null) : rows.get(0);
    }

    public AccountMixResponseDTO getAccountMix() {
        var np = new NamedParameterJdbcTemplate(jdbc);

        String sql = """
      SELECT category,
             accounts,
             exposure,
             total_accounts,
             total_exposure,
             exposure_share,
             hhi
      FROM analytics.vw_account_mix
      ORDER BY exposure DESC NULLS LAST, category
    """;

        var rows = np.query(sql, (rs, i) -> new Object[] {
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

        var entries = new java.util.ArrayList<AccountMixEntryDTO>();
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

    public ActiveAccountsDTO getActiveAccounts() {
        return jdbc.queryForObject(
                "SELECT active_accounts, total_exposure FROM analytics.vw_active_accounts",
                (rs, i) -> new ActiveAccountsDTO(
                        rs.getInt("active_accounts"),
                        rs.getBigDecimal("total_exposure")
                )
        );
    }

    public GlobalScoreDTO getGlobalScore() {
        return jdbc.queryForObject(
                "SELECT global_score, band FROM analytics.vw_global_score",
                (rs, i) -> new GlobalScoreDTO(rs.getInt("global_score"), rs.getString("band"))
        );
    }

    public CreditAgeDTO getCreditAge() {
        return jdbc.queryForObject(
                "SELECT oldest_months, avg_months FROM analytics.vw_credit_age",
                (rs, i) -> new CreditAgeDTO(
                        (Integer) rs.getObject("oldest_months"),
                        rs.getBigDecimal("avg_months")
                )
        );
    }

    public PaymentHistoryDTO getPaymentHistory() {
        return jdbc.queryForObject(
                """
                SELECT count_on_time, count_30, count_60, count_90p, total_accounts, on_time_ratio
                FROM analytics.vw_payment_history
                """,
                (rs, i) -> new PaymentHistoryDTO(
                        rs.getInt("count_on_time"),
                        rs.getInt("count_30"),
                        rs.getInt("count_60"),
                        rs.getInt("count_90p"),
                        rs.getInt("total_accounts"),
                        rs.getBigDecimal("on_time_ratio")
                )
        );
    }


}
