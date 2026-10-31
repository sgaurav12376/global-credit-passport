alter table passport_share_grants
  add column if not exists borrower_response varchar(4000),
  add column if not exists borrower_responded_at timestamptz;

alter table lender_review_events
  add column if not exists borrower_response varchar(4000);
