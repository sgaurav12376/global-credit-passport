CREATE TABLE lender_passport_invitations (
  id             UUID PRIMARY KEY,
  token_hash     VARCHAR(64) NOT NULL UNIQUE,
  lender_name    VARCHAR(200) NOT NULL,
  purpose        VARCHAR(200) NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,
  borrower_id    UUID,
  passport_id    UUID REFERENCES passports(id) ON DELETE SET NULL,
  share_grant_id UUID REFERENCES passport_share_grants(id) ON DELETE SET NULL,
  authorized_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lender_passport_invitations_created_at
  ON lender_passport_invitations(created_at DESC);
