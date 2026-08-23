CREATE TABLE plaid_financial_snapshots (
  id                    UUID PRIMARY KEY,
  borrower_id           UUID NOT NULL,
  passport_id           UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
  methodology_version   VARCHAR(64) NOT NULL,
  summary               JSONB NOT NULL,
  source_item_ids       JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plaid_financial_snapshots_borrower_passport
  ON plaid_financial_snapshots(borrower_id, passport_id, created_at DESC);

CREATE INDEX idx_plaid_financial_snapshots_passport
  ON plaid_financial_snapshots(passport_id);
