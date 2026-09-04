ALTER TABLE passports
  ADD COLUMN current_section VARCHAR(40) NOT NULL DEFAULT 'PURPOSE';

UPDATE passports
SET current_section = 'OVERVIEW'
WHERE status = 'ACTIVE';
