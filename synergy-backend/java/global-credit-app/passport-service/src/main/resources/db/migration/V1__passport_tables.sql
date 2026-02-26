CREATE TABLE IF NOT EXISTS passports (
  id              UUID PRIMARY KEY,
  user_id         UUID NOT NULL,
  purpose         VARCHAR(64) NOT NULL,
  origin_country  VARCHAR(8)  NOT NULL,
  dest_country    VARCHAR(8)  NOT NULL,
  full_name       VARCHAR(160),
  dob             DATE,
  status          VARCHAR(32) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passports_user_id ON passports(user_id);

CREATE TABLE IF NOT EXISTS passport_sources (
  id           UUID PRIMARY KEY,
  passport_id  UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
  source_type  VARCHAR(32) NOT NULL,
  connected    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passport_sources_passport_id ON passport_sources(passport_id);
