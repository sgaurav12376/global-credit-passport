ALTER TABLE passports
  ADD COLUMN supersedes_passport_id UUID NULL REFERENCES passports(id);

CREATE INDEX idx_passports_user_updated
  ON passports (user_id, updated_at DESC);

CREATE INDEX idx_passports_supersedes
  ON passports (supersedes_passport_id);
