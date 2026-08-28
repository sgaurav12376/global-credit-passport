ALTER TABLE surepass_credit_reports
  ADD COLUMN inherited_from_report_id UUID
  REFERENCES surepass_credit_reports(id);

CREATE INDEX idx_surepass_reports_inherited_from
  ON surepass_credit_reports(inherited_from_report_id)
  WHERE inherited_from_report_id IS NOT NULL;
