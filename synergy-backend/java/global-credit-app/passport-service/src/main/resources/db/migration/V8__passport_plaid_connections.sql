CREATE TABLE passport_plaid_connections (
  id BIGSERIAL PRIMARY KEY,
  borrower_id UUID NOT NULL,
  passport_id UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
  plaid_connection_id UUID NOT NULL REFERENCES plaid_connections(id) ON DELETE CASCADE,
  consent_version VARCHAR(64) NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  attached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_passport_plaid_connection UNIQUE (passport_id, plaid_connection_id)
);

CREATE INDEX idx_passport_plaid_active
  ON passport_plaid_connections (borrower_id, passport_id, active);

INSERT INTO passport_plaid_connections (
  borrower_id,
  passport_id,
  plaid_connection_id,
  consent_version,
  consented_at,
  active,
  attached_at
)
SELECT
  borrower_id,
  passport_id,
  id,
  'legacy-plaid-connection-v1',
  created_at,
  TRUE,
  created_at
FROM plaid_connections
WHERE passport_id IS NOT NULL
ON CONFLICT (passport_id, plaid_connection_id) DO NOTHING;

CREATE VIEW plaid_monthly_cashflow_by_item AS
SELECT
  pt.borrower_id,
  pt.item_id,
  DATE_TRUNC('month', pt.transaction_date)::DATE AS month,
  COUNT(*) AS transaction_count,
  COALESCE(SUM(CASE
    WHEN pt.amount < 0 AND pt.personal_category_primary = 'INCOME'
    THEN -pt.amount ELSE 0 END), 0) AS detected_income,
  COALESCE(SUM(CASE
    WHEN pt.amount < 0 AND (
      UPPER(COALESCE(pt.transaction_name, '')) LIKE '%INTRST%'
      OR UPPER(COALESCE(pt.transaction_name, '')) LIKE '%INTEREST%'
    ) THEN -pt.amount ELSE 0 END), 0) AS interest_income,
  COALESCE(SUM(CASE
    WHEN pt.amount < 0
      AND COALESCE(pt.personal_category_primary, '') NOT IN ('INCOME', 'TRANSFER_IN')
      AND UPPER(COALESCE(pt.transaction_name, '')) NOT LIKE '%INTRST%'
      AND UPPER(COALESCE(pt.transaction_name, '')) NOT LIKE '%INTEREST%'
    THEN -pt.amount ELSE 0 END), 0) AS refunds_other_credits,
  COALESCE(SUM(CASE
    WHEN pt.amount > 0 AND COALESCE(pt.personal_category_primary, '') <> 'TRANSFER_OUT'
    THEN pt.amount ELSE 0 END), 0) AS total_outflows,
  COALESCE(SUM(CASE
    WHEN pt.amount > 0 AND pt.personal_category_primary = 'LOAN_PAYMENTS'
    THEN pt.amount ELSE 0 END), 0) AS debt_payments
FROM plaid_transactions pt
JOIN plaid_accounts pa
  ON pa.item_id = pt.item_id
 AND pa.account_id = pt.account_id
WHERE pt.active
  AND pt.transaction_date IS NOT NULL
  AND pa.account_type = 'depository'
GROUP BY pt.borrower_id, pt.item_id, DATE_TRUNC('month', pt.transaction_date)::DATE;
