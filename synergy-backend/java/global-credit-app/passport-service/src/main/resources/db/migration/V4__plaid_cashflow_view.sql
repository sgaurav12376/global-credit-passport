CREATE VIEW plaid_monthly_cashflow AS
SELECT
  pt.borrower_id,
  DATE_TRUNC('month', pt.transaction_date)::DATE AS month,
  COUNT(*) AS transaction_count,
  COALESCE(SUM(
    CASE
      WHEN pt.amount < 0
       AND COALESCE(pt.personal_category_primary, '') <> 'TRANSFER_IN'
      THEN -pt.amount
      ELSE 0
    END
  ), 0) AS total_inflows,
  COALESCE(SUM(
    CASE
      WHEN pt.amount < 0
       AND pt.personal_category_primary = 'INCOME'
      THEN -pt.amount
      ELSE 0
    END
  ), 0) AS detected_income,
  COALESCE(SUM(
    CASE
      WHEN pt.amount > 0
       AND COALESCE(pt.personal_category_primary, '') <> 'TRANSFER_OUT'
      THEN pt.amount
      ELSE 0
    END
  ), 0) AS total_outflows,
  COALESCE(SUM(
    CASE
      WHEN pt.amount > 0
       AND pt.personal_category_primary = 'LOAN_PAYMENTS'
      THEN pt.amount
      ELSE 0
    END
  ), 0) AS debt_payments
FROM plaid_transactions pt
JOIN plaid_accounts pa
  ON pa.item_id = pt.item_id
 AND pa.account_id = pt.account_id
WHERE pt.active
  AND pt.transaction_date IS NOT NULL
  AND pa.account_type = 'depository'
GROUP BY
  pt.borrower_id,
  DATE_TRUNC('month', pt.transaction_date)::DATE;
