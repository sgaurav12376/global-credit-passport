ALTER TABLE passport_share_grants
  ADD COLUMN review_status VARCHAR(40) NOT NULL DEFAULT 'NOT_OPENED',
  ADD COLUMN review_outcome VARCHAR(40),
  ADD COLUMN borrower_message VARCHAR(2000),
  ADD COLUMN internal_note VARCHAR(4000),
  ADD COLUMN review_updated_at TIMESTAMPTZ,
  ADD COLUMN review_completed_at TIMESTAMPTZ;

CREATE TABLE lender_review_events (
  id UUID PRIMARY KEY,
  share_grant_id UUID NOT NULL REFERENCES passport_share_grants(id) ON DELETE CASCADE,
  event_type VARCHAR(40) NOT NULL,
  from_status VARCHAR(40),
  to_status VARCHAR(40) NOT NULL,
  borrower_message VARCHAR(2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lender_review_events_share_created
  ON lender_review_events(share_grant_id, created_at);
