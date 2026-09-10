CREATE TABLE passport_share_grants (
  id                UUID PRIMARY KEY,
  borrower_id       UUID NOT NULL,
  passport_id       UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
  output_id         UUID NOT NULL REFERENCES passport_outputs(id) ON DELETE CASCADE,
  token_hash        VARCHAR(64) NOT NULL UNIQUE,
  recipient_name    VARCHAR(200) NOT NULL,
  purpose           VARCHAR(200) NOT NULL,
  scope             VARCHAR(64) NOT NULL,
  consent_version   VARCHAR(64) NOT NULL,
  consented_at      TIMESTAMPTZ NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  revoked_at        TIMESTAMPTZ,
  last_accessed_at  TIMESTAMPTZ,
  access_count      BIGINT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_passport_share_grants_borrower_passport
  ON passport_share_grants(borrower_id, passport_id, created_at DESC);
