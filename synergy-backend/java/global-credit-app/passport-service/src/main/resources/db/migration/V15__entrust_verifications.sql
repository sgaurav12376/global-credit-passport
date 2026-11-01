ALTER TABLE passports ADD COLUMN residence_country VARCHAR(3);
UPDATE passports SET residence_country = origin_country WHERE residence_country IS NULL;
ALTER TABLE passports ALTER COLUMN residence_country SET NOT NULL;

CREATE TABLE entrust_verifications (
  id UUID PRIMARY KEY,
  borrower_id UUID NOT NULL,
  passport_id UUID NOT NULL REFERENCES passports(id),
  applicant_id VARCHAR(120) NOT NULL,
  workflow_run_id VARCHAR(120) NOT NULL UNIQUE,
  workflow_id VARCHAR(120) NOT NULL,
  status VARCHAR(40) NOT NULL,
  capture_url TEXT,
  provider_error TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_entrust_verification_passport
  ON entrust_verifications (borrower_id, passport_id, created_at DESC);
