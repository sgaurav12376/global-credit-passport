CREATE TABLE plaid_connections (
  id                      UUID PRIMARY KEY,
  borrower_id             UUID NOT NULL,
  passport_id             UUID,
  item_id                 VARCHAR(255) NOT NULL UNIQUE,
  encrypted_access_token  TEXT NOT NULL,
  transactions_cursor     TEXT,
  identity_accounts       JSONB NOT NULL DEFAULT '{}'::jsonb,
  added_transactions      JSONB NOT NULL DEFAULT '[]'::jsonb,
  modified_transactions   JSONB NOT NULL DEFAULT '[]'::jsonb,
  removed_transactions    JSONB NOT NULL DEFAULT '[]'::jsonb,
  status                  VARCHAR(32) NOT NULL DEFAULT 'CONNECTED',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plaid_connections_borrower_id
  ON plaid_connections(borrower_id);

CREATE INDEX idx_plaid_connections_passport_id
  ON plaid_connections(passport_id);
