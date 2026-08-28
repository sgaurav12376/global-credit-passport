ALTER TABLE surepass_credit_reports
  DROP CONSTRAINT uq_surepass_bureau_provider_reference;

ALTER TABLE surepass_credit_reports
  ADD CONSTRAINT uq_surepass_passport_bureau_provider_reference
  UNIQUE (passport_id, bureau, provider_reference);
