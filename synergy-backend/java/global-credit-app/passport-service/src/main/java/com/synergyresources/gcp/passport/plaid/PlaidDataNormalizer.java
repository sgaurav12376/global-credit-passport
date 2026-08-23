package com.synergyresources.gcp.passport.plaid;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class PlaidDataNormalizer {
  private final JdbcTemplate jdbcTemplate;

  public PlaidDataNormalizer(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public void normalizeAccounts(String itemId, UUID borrowerId, JsonNode identityAndAccounts) {
    JsonNode accounts = identityAndAccounts.path("accounts");
    if (!accounts.isArray()) return;

    accounts.forEach(account -> jdbcTemplate.update("""
        INSERT INTO plaid_accounts (
          item_id, account_id, borrower_id, name, official_name, mask,
          account_type, account_subtype, currency_code, current_balance,
          available_balance, credit_limit, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb))
        ON CONFLICT (item_id, account_id) DO UPDATE SET
          borrower_id = EXCLUDED.borrower_id,
          name = EXCLUDED.name,
          official_name = EXCLUDED.official_name,
          mask = EXCLUDED.mask,
          account_type = EXCLUDED.account_type,
          account_subtype = EXCLUDED.account_subtype,
          currency_code = EXCLUDED.currency_code,
          current_balance = EXCLUDED.current_balance,
          available_balance = EXCLUDED.available_balance,
          credit_limit = EXCLUDED.credit_limit,
          raw_json = EXCLUDED.raw_json,
          updated_at = NOW()
        """,
        itemId,
        text(account, "account_id"),
        borrowerId,
        text(account, "name"),
        text(account, "official_name"),
        text(account, "mask"),
        text(account, "type"),
        text(account, "subtype"),
        text(account.path("balances"), "iso_currency_code"),
        decimal(account.path("balances"), "current"),
        decimal(account.path("balances"), "available"),
        decimal(account.path("balances"), "limit"),
        account.toString()
    ));
  }

  public void reconcileTransactions(
      String itemId,
      UUID borrowerId,
      JsonNode added,
      JsonNode modified,
      JsonNode removed
  ) {
    upsertTransactions(itemId, borrowerId, added);
    upsertTransactions(itemId, borrowerId, modified);

    if (removed != null && removed.isArray()) {
      removed.forEach(transaction -> jdbcTemplate.update("""
          UPDATE plaid_transactions
          SET active = FALSE, removed_at = NOW(), updated_at = NOW()
          WHERE item_id = ? AND transaction_id = ?
          """,
          itemId,
          text(transaction, "transaction_id")
      ));
    }
  }

  private void upsertTransactions(String itemId, UUID borrowerId, JsonNode transactions) {
    if (transactions == null || !transactions.isArray()) return;

    transactions.forEach(transaction -> jdbcTemplate.update("""
        INSERT INTO plaid_transactions (
          item_id, transaction_id, borrower_id, account_id, transaction_date,
          authorized_date, transaction_name, merchant_name, amount, currency_code,
          pending, personal_category_primary, personal_category_detail,
          active, removed_at, raw_json
        ) VALUES (
          ?, ?, ?, ?, CAST(? AS date), CAST(? AS date), ?, ?, ?, ?, ?, ?, ?, TRUE, NULL,
          CAST(? AS jsonb)
        )
        ON CONFLICT (item_id, transaction_id) DO UPDATE SET
          borrower_id = EXCLUDED.borrower_id,
          account_id = EXCLUDED.account_id,
          transaction_date = EXCLUDED.transaction_date,
          authorized_date = EXCLUDED.authorized_date,
          transaction_name = EXCLUDED.transaction_name,
          merchant_name = EXCLUDED.merchant_name,
          amount = EXCLUDED.amount,
          currency_code = EXCLUDED.currency_code,
          pending = EXCLUDED.pending,
          personal_category_primary = EXCLUDED.personal_category_primary,
          personal_category_detail = EXCLUDED.personal_category_detail,
          active = TRUE,
          removed_at = NULL,
          raw_json = EXCLUDED.raw_json,
          updated_at = NOW()
        """,
        itemId,
        text(transaction, "transaction_id"),
        borrowerId,
        text(transaction, "account_id"),
        text(transaction, "date"),
        text(transaction, "authorized_date"),
        text(transaction, "name"),
        text(transaction, "merchant_name"),
        decimal(transaction, "amount"),
        text(transaction, "iso_currency_code"),
        transaction.path("pending").asBoolean(false),
        text(transaction.path("personal_finance_category"), "primary"),
        text(transaction.path("personal_finance_category"), "detailed"),
        transaction.toString()
    ));
  }

  private String text(JsonNode node, String field) {
    JsonNode value = node.path(field);
    return value.isMissingNode() || value.isNull() ? null : value.asText();
  }

  private BigDecimal decimal(JsonNode node, String field) {
    JsonNode value = node.path(field);
    return value.isNumber() ? value.decimalValue() : null;
  }
}
