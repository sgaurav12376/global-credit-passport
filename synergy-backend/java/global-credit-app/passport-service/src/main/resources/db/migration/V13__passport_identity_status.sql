ALTER TABLE passports
  ADD COLUMN identity_status VARCHAR(40) NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN identity_completed_at TIMESTAMPTZ,
  ADD COLUMN identity_verified_name VARCHAR(255),
  ADD COLUMN identity_verified_dob DATE;

-- Existing active pilot passports passed the former manual Entrust-completion gate.
-- Record that historical fact without claiming a provider-verified result.
UPDATE passports
SET identity_status = 'PILOT_COMPLETED',
    identity_completed_at = updated_at,
    identity_verified_name = full_name,
    identity_verified_dob = dob
WHERE status = 'ACTIVE';

UPDATE passports AS draft
SET identity_status = parent.identity_status,
    identity_completed_at = parent.identity_completed_at,
    identity_verified_name = parent.identity_verified_name,
    identity_verified_dob = parent.identity_verified_dob
FROM passports AS parent
WHERE draft.supersedes_passport_id = parent.id
  AND draft.status IN ('IN_PROGRESS', 'DRAFT')
  AND draft.identity_status = 'NOT_STARTED'
  AND parent.identity_status IN ('PILOT_COMPLETED', 'ENTRUST_SUBMITTED');
