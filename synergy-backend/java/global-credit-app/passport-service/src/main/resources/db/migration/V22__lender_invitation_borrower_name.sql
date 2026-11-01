ALTER TABLE lender_passport_invitations
  ADD COLUMN borrower_name VARCHAR(200);

UPDATE lender_passport_invitations
SET borrower_name = 'Borrower'
WHERE borrower_name IS NULL;

ALTER TABLE lender_passport_invitations
  ALTER COLUMN borrower_name SET NOT NULL;
