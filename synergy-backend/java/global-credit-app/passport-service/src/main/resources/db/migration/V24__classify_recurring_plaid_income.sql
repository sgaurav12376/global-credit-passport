DROP VIEW plaid_monthly_cashflow;
DROP VIEW plaid_monthly_cashflow_by_item;

CREATE VIEW plaid_classified_cashflow_transactions AS
WITH eligible AS (
  SELECT
    pt.*,
    UPPER(REGEXP_REPLACE(
      COALESCE(NULLIF(pt.merchant_name, ''), NULLIF(pt.transaction_name, ''), 'UNKNOWN'),
      '\s+', ' ', 'g'
    )) AS credit_key,
    DATE_TRUNC('month', pt.transaction_date)::DATE AS transaction_month
  FROM plaid_transactions pt
  JOIN plaid_accounts pa
    ON pa.item_id = pt.item_id
   AND pa.account_id = pt.account_id
  WHERE pt.active
    AND pt.transaction_date IS NOT NULL
    AND pa.account_type = 'depository'
), recurring_credits AS (
  SELECT borrower_id, item_id, credit_key
  FROM eligible
  WHERE amount < 0
    AND COALESCE(personal_category_primary, '') NOT IN ('INCOME', 'TRANSFER_IN')
    AND COALESCE(personal_category_detail, '') NOT LIKE 'INCOME_%'
    AND COALESCE(personal_category_detail, '') NOT LIKE 'TRANSFER_IN_%'
    AND credit_key NOT LIKE '%INTEREST%'
    AND credit_key NOT LIKE '%INTRST%'
    AND credit_key NOT LIKE '%REFUND%'
    AND credit_key NOT LIKE '%REVERSAL%'
    AND credit_key NOT LIKE '%TRANSFER%'
    AND credit_key NOT LIKE '%VENMO%'
    AND credit_key NOT LIKE '%ZELLE%'
    AND credit_key NOT LIKE '%CASH APP%'
    AND credit_key NOT LIKE '%PAYPAL%'
  GROUP BY borrower_id, item_id, credit_key
  HAVING COUNT(DISTINCT transaction_month) >= 3
    AND AVG(-amount) >= 200
    AND COALESCE(STDDEV_POP(-amount) / NULLIF(AVG(-amount), 0), 1) <= 0.20
)
SELECT
  e.*,
  (
    e.amount < 0
    AND (
      e.personal_category_primary = 'INCOME'
      OR e.personal_category_detail IN (
        'INCOME_WAGES', 'INCOME_RETIREMENT_PENSION',
        'INCOME_UNEMPLOYMENT', 'INCOME_OTHER_INCOME'
      )
      OR e.credit_key LIKE '%PAYROLL%'
      OR e.credit_key LIKE '%DIRECT DEP%'
      OR e.credit_key LIKE '%SALARY%'
      OR e.credit_key LIKE '%WAGES%'
      OR e.credit_key LIKE '%PAYCHECK%'
      OR e.credit_key LIKE '%GUSTO%'
      OR e.credit_key LIKE '%ADP%'
      OR EXISTS (
        SELECT 1
        FROM recurring_credits recurring
        WHERE recurring.borrower_id = e.borrower_id
          AND recurring.item_id = e.item_id
          AND recurring.credit_key = e.credit_key
      )
    )
    AND e.credit_key NOT LIKE '%INTEREST%'
    AND e.credit_key NOT LIKE '%INTRST%'
  ) AS classified_income,
  (
    e.amount < 0
    AND (e.credit_key LIKE '%INTEREST%' OR e.credit_key LIKE '%INTRST%')
  ) AS classified_interest
FROM eligible e;

CREATE VIEW plaid_monthly_cashflow AS
SELECT
  borrower_id,
  transaction_month AS month,
  COUNT(*) AS transaction_count,
  COALESCE(SUM(CASE WHEN classified_income THEN -amount ELSE 0 END), 0) AS detected_income,
  COALESCE(SUM(CASE WHEN classified_interest THEN -amount ELSE 0 END), 0) AS interest_income,
  COALESCE(SUM(CASE
    WHEN amount < 0
      AND NOT classified_income
      AND NOT classified_interest
      AND COALESCE(personal_category_primary, '') <> 'TRANSFER_IN'
    THEN -amount ELSE 0 END), 0) AS refunds_other_credits,
  COALESCE(SUM(CASE
    WHEN amount > 0 AND COALESCE(personal_category_primary, '') <> 'TRANSFER_OUT'
    THEN amount ELSE 0 END), 0) AS total_outflows,
  COALESCE(SUM(CASE
    WHEN amount > 0 AND personal_category_primary = 'LOAN_PAYMENTS'
    THEN amount ELSE 0 END), 0) AS debt_payments
FROM plaid_classified_cashflow_transactions
GROUP BY borrower_id, transaction_month;

CREATE VIEW plaid_monthly_cashflow_by_item AS
SELECT
  borrower_id,
  item_id,
  transaction_month AS month,
  COUNT(*) AS transaction_count,
  COALESCE(SUM(CASE WHEN classified_income THEN -amount ELSE 0 END), 0) AS detected_income,
  COALESCE(SUM(CASE WHEN classified_interest THEN -amount ELSE 0 END), 0) AS interest_income,
  COALESCE(SUM(CASE
    WHEN amount < 0
      AND NOT classified_income
      AND NOT classified_interest
      AND COALESCE(personal_category_primary, '') <> 'TRANSFER_IN'
    THEN -amount ELSE 0 END), 0) AS refunds_other_credits,
  COALESCE(SUM(CASE
    WHEN amount > 0 AND COALESCE(personal_category_primary, '') <> 'TRANSFER_OUT'
    THEN amount ELSE 0 END), 0) AS total_outflows,
  COALESCE(SUM(CASE
    WHEN amount > 0 AND personal_category_primary = 'LOAN_PAYMENTS'
    THEN amount ELSE 0 END), 0) AS debt_payments
FROM plaid_classified_cashflow_transactions
GROUP BY borrower_id, item_id, transaction_month;
