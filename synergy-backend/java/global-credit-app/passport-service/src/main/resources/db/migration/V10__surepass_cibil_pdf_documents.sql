ALTER TABLE surepass_credit_reports
  ADD COLUMN document_storage_key VARCHAR(512),
  ADD COLUMN document_content_type VARCHAR(128),
  ADD COLUMN document_sha256 VARCHAR(64),
  ADD COLUMN document_size_bytes BIGINT;
