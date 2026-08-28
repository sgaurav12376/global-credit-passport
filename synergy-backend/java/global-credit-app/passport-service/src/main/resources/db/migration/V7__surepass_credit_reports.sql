CREATE TABLE surepass_credit_reports (
  id UUID PRIMARY KEY,
  borrower_id UUID NOT NULL,
  passport_id UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
  bureau VARCHAR(32) NOT NULL,
  provider_reference VARCHAR(255) NOT NULL,
  credit_score INTEGER,
  normalized_report JSONB NOT NULL,
  consent_version VARCHAR(64) NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_surepass_bureau_provider_reference
    UNIQUE (bureau, provider_reference)
);

CREATE INDEX idx_surepass_reports_borrower_passport_created
  ON surepass_credit_reports (borrower_id, passport_id, created_at DESC);
