CREATE TABLE passport_outputs (
  id              UUID PRIMARY KEY,
  borrower_id     UUID NOT NULL,
  passport_id     UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
  schema_version  VARCHAR(64) NOT NULL,
  document        JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_passport_outputs_borrower_passport
  ON passport_outputs(borrower_id, passport_id, created_at DESC);
