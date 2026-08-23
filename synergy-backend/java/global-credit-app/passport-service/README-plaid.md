# Plaid pilot integration

The passport service exposes two backend-only Plaid orchestration endpoints:

- `POST /v1/plaid/link-token` creates a Link token for a GCP borrower.
- `POST /v1/plaid/connections` exchanges a Link public token, retrieves identity
  plus accounts, and synchronizes all transaction pages.

Configure credentials as process environment variables. Never place the Plaid
secret or access tokens in React/Vite configuration or commit them to Git.

```bash
export PLAID_BASE_URL=https://sandbox.plaid.com
export PLAID_CLIENT_ID='<client-id>'
read -s PLAID_SECRET
export PLAID_SECRET
```

Create a Link token:

```bash
curl -s -X POST http://localhost:8087/v1/plaid/link-token \
  -H 'Content-Type: application/json' \
  -d '{}'
```

After Plaid Link returns a fresh `public_token`, complete the connection:

```bash
curl -s -X POST http://localhost:8087/v1/plaid/connections \
  -H 'Content-Type: application/json' \
  -d '{
    "passportId":null,
    "publicToken":"<fresh-public-token>"
  }'
```

The access token is used only inside the orchestration call and is never
returned. This pilot does not yet persist it. Production follow-up must encrypt
and store the access token, Item ID, consent metadata, and transaction cursor so
webhook-driven incremental sync can continue after a service restart.
