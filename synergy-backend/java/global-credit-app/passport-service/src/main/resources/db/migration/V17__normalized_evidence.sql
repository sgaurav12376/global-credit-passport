CREATE TABLE normalized_evidence (
  id                    UUID PRIMARY KEY,
  borrower_id           UUID NOT NULL,
  passport_id           UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
  domain                VARCHAR(32) NOT NULL,
  country_code          VARCHAR(2) NOT NULL,
  provider              VARCHAR(64) NOT NULL,
  source_system         VARCHAR(64) NOT NULL,
  provider_reference    VARCHAR(255),
  schema_version        VARCHAR(64) NOT NULL,
  adapter_id            VARCHAR(128) NOT NULL,
  adapter_version       VARCHAR(32) NOT NULL,
  completeness_percent  INTEGER NOT NULL CHECK (completeness_percent BETWEEN 0 AND 100),
  payload               JSONB NOT NULL,
  retrieved_at          TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_normalized_evidence_passport
  ON normalized_evidence(borrower_id, passport_id, created_at DESC);

CREATE INDEX idx_normalized_evidence_domain
  ON normalized_evidence(passport_id, domain, country_code, provider);
