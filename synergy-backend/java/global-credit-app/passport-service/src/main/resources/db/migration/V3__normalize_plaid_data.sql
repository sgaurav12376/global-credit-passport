CREATE TABLE plaid_accounts (
  item_id              VARCHAR(255) NOT NULL,
  account_id           VARCHAR(255) NOT NULL,
  borrower_id          UUID NOT NULL,
  name                 VARCHAR(255),
  official_name        VARCHAR(500),
  mask                 VARCHAR(32),
  account_type         VARCHAR(64),
  account_subtype      VARCHAR(128),
  currency_code        VARCHAR(16),
  current_balance      NUMERIC(19,4),
  available_balance    NUMERIC(19,4),
  credit_limit         NUMERIC(19,4),
  raw_json             JSONB NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (item_id, account_id),
  CONSTRAINT fk_plaid_accounts_connection
    FOREIGN KEY (item_id) REFERENCES plaid_connections(item_id) ON DELETE CASCADE
);

CREATE INDEX idx_plaid_accounts_borrower_id ON plaid_accounts(borrower_id);
CREATE INDEX idx_plaid_accounts_account_id ON plaid_accounts(account_id);

CREATE TABLE plaid_transactions (
  item_id                    VARCHAR(255) NOT NULL,
  transaction_id             VARCHAR(255) NOT NULL,
  borrower_id                UUID NOT NULL,
  account_id                 VARCHAR(255),
  transaction_date           DATE,
  authorized_date            DATE,
  transaction_name           VARCHAR(500),
  merchant_name              VARCHAR(500),
  amount                     NUMERIC(19,4),
  currency_code              VARCHAR(16),
  pending                    BOOLEAN NOT NULL DEFAULT FALSE,
  personal_category_primary  VARCHAR(128),
  personal_category_detail   VARCHAR(255),
  active                     BOOLEAN NOT NULL DEFAULT TRUE,
  removed_at                 TIMESTAMPTZ,
  raw_json                   JSONB NOT NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (item_id, transaction_id),
  CONSTRAINT fk_plaid_transactions_connection
    FOREIGN KEY (item_id) REFERENCES plaid_connections(item_id) ON DELETE CASCADE
);

CREATE INDEX idx_plaid_transactions_borrower_id
  ON plaid_transactions(borrower_id);
CREATE INDEX idx_plaid_transactions_account_id
  ON plaid_transactions(item_id, account_id);
CREATE INDEX idx_plaid_transactions_date
  ON plaid_transactions(transaction_date);
CREATE INDEX idx_plaid_transactions_active
  ON plaid_transactions(item_id, active);
