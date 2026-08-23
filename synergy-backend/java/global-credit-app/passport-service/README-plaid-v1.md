# Plaid v1 — Global Credit Passport

## Status

Plaid v1 is the local Sandbox pilot integration for US bank accounts. It retrieves
consumer-permissioned bank data, normalizes accounts and transactions, calculates
borrower-level cash-flow indicators, and preserves versioned financial snapshots
when a passport is generated.

The output is a pilot indicator and is not itself a credit decision.

## End-to-end flow

1. React requests a Link token from passport-service.
2. The borrower completes Plaid Link consent.
3. React sends the short-lived public token to passport-service.
4. passport-service exchanges it for an Item-specific access token.
5. The access token is encrypted before persistence.
6. Identity/accounts and Transactions Sync data are retrieved.
7. Raw provider JSON is retained and normalized relationally.
8. Cash flow is calculated across the borrower's active depository accounts.
9. Passport generation stores an immutable `PLAID_CASHFLOW_V1` snapshot.

## Implemented APIs

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/plaid/link-token` | Create Plaid Link token |
| POST | `/v1/plaid/connections` | Exchange public token and ingest an Item |
| GET | `/v1/plaid/connections` | List borrower-owned connections |
| GET | `/v1/plaid/connections/latest` | Retrieve latest connection |
| POST | `/v1/plaid/connections/{itemId}/refresh` | Incrementally synchronize transactions |
| DELETE | `/v1/plaid/connections/{itemId}` | Revoke Item and remove live local data |
| GET | `/v1/plaid/financial-summary` | Calculate the current borrower summary |
| POST | `/v1/plaid/financial-snapshots` | Manually create a snapshot for testing/admin |
| GET | `/v1/plaid/financial-snapshots/{snapshotId}` | Retrieve borrower-owned snapshot |
| GET | `/v1/plaid/financial-snapshots?passportId=...` | List passport snapshot versions |

`POST /v1/passports/{passportId}/generate` automatically creates a snapshot when
the borrower has an eligible Plaid connection.

## Data model

- `plaid_connections`: encrypted token, Item, cursor and raw provider payloads.
- `plaid_accounts`: normalized accounts keyed by Item and account ID.
- `plaid_transactions`: normalized added/modified/removed transaction state.
- `plaid_monthly_cashflow`: current monthly aggregation view.
- `plaid_financial_snapshots`: immutable passport-time financial summaries.

Removing a live connection cascades its normalized accounts and transactions. It
does not remove a historical financial snapshot. Snapshot deletion follows the
passport lifecycle because snapshots reference `passports(id)`.

## Plaid amount convention

Plaid Transactions normally represents money leaving an account as positive and
money entering an account as negative. GCP classifies incoming credits before
treating them as income:

- recognized payroll/earned income → detected income;
- interest credits → interest income;
- merchant credits/reversals → refunds or other credits;
- transfers → excluded from earned income.

## Cash-flow methodology: `PLAID_CASHFLOW_V1`

The first and last observed calendar months are treated as partial. Monthly
averages use only complete months.

```text
average(category) = total category amount in complete months / complete months

sustainable net = detected income + interest income - outflows

observed net = sustainable net + refunds/other credits
```

Debt payments are included within total outflows and shown separately for risk
analysis; they are not subtracted twice. Refunds are excluded from sustainable
cash flow because they are not recurring repayment capacity.

Income stability is null when fewer than two complete months exist or when mean
detected earned income is zero.

## Duplicate prevention

Plaid can create a new Item when the same institution is linked again. GCP checks
institution ID and overlapping account fingerprints (mask, type, subtype and
official name). A duplicate returns HTTP `409`, and the newly created provider
Item is removed before any duplicate transactions are stored.

## Authentication modes

### Local development

```bash
export GCP_AUTH_MODE=local
export GCP_LOCAL_BORROWER_ID=00000000-0000-0000-0000-000000000001
```

React uses `VITE_AUTH_MODE=local`. No AWS service is required.

### Cognito

Outside local development, use `GCP_AUTH_MODE=cognito`, a Cognito issuer URI and
app-client ID. The validated access-token `sub` becomes the borrower UUID. Cognito
is the secure default if the backend mode is omitted.

## Regression test

With PostgreSQL, passport-service and Plaid Sandbox credentials running locally:

```bash
cd /Users/synergy/global-credit-passport
chmod +x scripts/test-plaid-v1.sh
./scripts/test-plaid-v1.sh
```

The script is non-destructive to bank connections and snapshots. It performs a
normal incremental refresh, then confirms that the previously generated snapshot
hash did not change.

Manual cases retained for UI validation:

1. Reconnecting the same accounts returns HTTP `409`.
2. Switching `GCP_LOCAL_BORROWER_ID` hides another borrower's data.
3. Removing a bank recalculates the live summary.
4. A historical snapshot remains available after live connection removal.

## Deferred production work

- Plaid transaction and Item webhooks with signature verification.
- Link update mode for `ITEM_LOGIN_REQUIRED` and expired consent.
- Production OAuth redirect configuration and institution approval.
- GCP Secret Manager and Cloud KMS.
- Production retention, deletion, monitoring and alerting policies.
- Legal/product determination for Plaid Check and FCRA-regulated credit use.
- Optional Liabilities and Income Verification products.

These items are deliberately outside the Sandbox pilot boundary.
