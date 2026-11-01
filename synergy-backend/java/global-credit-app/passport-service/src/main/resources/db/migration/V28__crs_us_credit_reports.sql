CREATE TABLE crs_credit_reports (
  id UUID PRIMARY KEY,
  borrower_id UUID NOT NULL,
  passport_id UUID NOT NULL REFERENCES passports(id),
  bureau VARCHAR(32) NOT NULL,
  provider_reference VARCHAR(255) NOT NULL,
  request_id VARCHAR(255),
  credit_score INTEGER,
  normalized_report JSONB NOT NULL,
  consent_version VARCHAR(80) NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL,
  data_mode VARCHAR(20) NOT NULL,
  permissible_purpose VARCHAR(40) NOT NULL,
  inquiry_type VARCHAR(20) NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_crs_credit_reports_passport_created ON crs_credit_reports(passport_id, created_at DESC);
