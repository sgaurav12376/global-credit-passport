#!/usr/bin/env bash
set -euo pipefail

API_BASE="${GCP_API_BASE:-http://localhost:8087}"
DB_CONTAINER="${GCP_DB_CONTAINER:-gcp-postgres}"
DB_USER="${GCP_DB_USER:-gcp}"
DB_NAME="${GCP_DB_NAME:-gcp}"
BORROWER_ID="${GCP_LOCAL_BORROWER_ID:-00000000-0000-0000-0000-000000000001}"

for command in curl docker python3; do
  command -v "$command" >/dev/null || {
    echo "ERROR: required command is missing: $command" >&2
    exit 1
  }
done

TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT

request_json() {
  local output_file=$1
  local method=$2
  local url=$3
  local status
  status=$(curl -sS -o "$output_file" -w '%{http_code}' -X "$method" "$url")
  if [[ "$status" != "200" ]]; then
    echo "ERROR: $method $url returned HTTP $status" >&2
    python3 -m json.tool "$output_file" 2>/dev/null || true
    exit 1
  fi
}

echo "1/7 Checking service health"
request_json "$TEST_DIR/health.json" GET "$API_BASE/actuator/health"
python3 - "$TEST_DIR/health.json" <<'PY'
import json, sys
with open(sys.argv[1]) as source:
    body = json.load(source)
assert body.get("status") == "UP", body
print("PASS: passport-service is UP")
PY

echo "2/7 Checking borrower connections and duplicate state"
request_json "$TEST_DIR/connections.json" GET "$API_BASE/v1/plaid/connections"
python3 - "$TEST_DIR/connections.json" "$BORROWER_ID" "$TEST_DIR/item-id.txt" <<'PY'
import json, sys
path, borrower_id, item_path = sys.argv[1:]
with open(path) as source:
    connections = json.load(source)
assert connections, "No Plaid connection is available"
signatures = []
for connection in connections:
    assert connection.get("borrowerId") == borrower_id, connection.get("borrowerId")
    identity = connection.get("identityAndAccounts") or {}
    item = identity.get("item") or {}
    accounts = identity.get("accounts") or []
    account_signatures = sorted(
        "|".join([
            str(account.get("mask") or ""),
            str(account.get("type") or "").lower(),
            str(account.get("subtype") or "").lower(),
            str(account.get("official_name") or account.get("name") or "").lower(),
        ])
        for account in accounts
        if account.get("mask")
    )
    signatures.append((item.get("institution_id") or item.get("institution_name"), tuple(account_signatures)))
assert len(signatures) == len(set(signatures)), "Duplicate institution/account connection detected"
with open(item_path, "w") as destination:
    destination.write(connections[0]["itemId"])
print(f"PASS: {len(connections)} connection(s), no duplicate account sets")
PY

echo "3/7 Checking cash-flow calculations"
request_json "$TEST_DIR/summary.json" GET "$API_BASE/v1/plaid/financial-summary"
python3 - "$TEST_DIR/summary.json" "$BORROWER_ID" <<'PY'
import json, sys
from decimal import Decimal
with open(sys.argv[1]) as source:
    summary = json.load(source)
money = lambda name: Decimal(str(summary[name])).quantize(Decimal("0.01"))
assert summary["borrowerId"] == sys.argv[2]
assert summary["analyzedTransactions"] > 0
assert summary["completeMonthsAnalyzed"] > 0
assert summary["calendarMonthsObserved"] == (
    summary["completeMonthsAnalyzed"] + summary["partialMonthsExcluded"]
)
expected_sustainable = (
    money("averageMonthlyDetectedIncome")
    + money("averageMonthlyInterestIncome")
    - money("averageMonthlyOutflows")
)
expected_observed = expected_sustainable + money("averageMonthlyRefundsOtherCredits")
assert money("averageMonthlySustainableNetCashflow") == expected_sustainable
assert money("averageMonthlyObservedNetCashflow") == expected_observed
assert "averageMonthlyDebtPayments" in summary
print("PASS: partial-month accounting and sustainable/observed formulas are correct")
PY

echo "4/7 Checking Flyway V6 and normalized data integrity"
V6_COUNT=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '6' AND success")
[[ "$V6_COUNT" == "1" ]] || { echo "ERROR: successful Flyway V6 was not found" >&2; exit 1; }
ORPHANS=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT COUNT(*) FROM plaid_transactions pt LEFT JOIN plaid_connections pc ON pc.item_id = pt.item_id WHERE pc.item_id IS NULL")
[[ "$ORPHANS" == "0" ]] || { echo "ERROR: found $ORPHANS orphan transaction(s)" >&2; exit 1; }
echo "PASS: Flyway V6 installed and no orphan transactions found"

echo "5/7 Finding the latest immutable snapshot"
SNAPSHOT_ID=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT id FROM plaid_financial_snapshots WHERE borrower_id = '$BORROWER_ID' ORDER BY created_at DESC LIMIT 1")
SNAPSHOT_ID=$(printf '%s' "$SNAPSHOT_ID" | tr -d '[:space:]')
[[ -n "$SNAPSHOT_ID" ]] || {
  echo "ERROR: no financial snapshot exists; generate a passport first" >&2
  exit 1
}
request_json "$TEST_DIR/snapshot-before.json" GET "$API_BASE/v1/plaid/financial-snapshots/$SNAPSHOT_ID"
BEFORE_HASH=$(python3 - "$TEST_DIR/snapshot-before.json" <<'PY'
import hashlib, json, sys
with open(sys.argv[1]) as source:
    snapshot = json.load(source)
assert snapshot["methodologyVersion"] == "PLAID_CASHFLOW_V1"
assert snapshot["sourceItemIds"], "Snapshot has no source Item IDs"
canonical = json.dumps(snapshot["summary"], sort_keys=True, separators=(",", ":"))
print(hashlib.sha256(canonical.encode()).hexdigest())
PY
)
echo "PASS: snapshot $SNAPSHOT_ID uses PLAID_CASHFLOW_V1"

echo "6/7 Refreshing transactions and proving snapshot immutability"
ITEM_ID=$(tr -d '[:space:]' < "$TEST_DIR/item-id.txt")
request_json "$TEST_DIR/refresh.json" POST "$API_BASE/v1/plaid/connections/$ITEM_ID/refresh"
request_json "$TEST_DIR/snapshot-after.json" GET "$API_BASE/v1/plaid/financial-snapshots/$SNAPSHOT_ID"
AFTER_HASH=$(python3 - "$TEST_DIR/snapshot-after.json" <<'PY'
import hashlib, json, sys
with open(sys.argv[1]) as source:
    snapshot = json.load(source)
canonical = json.dumps(snapshot["summary"], sort_keys=True, separators=(",", ":"))
print(hashlib.sha256(canonical.encode()).hexdigest())
PY
)
[[ "$BEFORE_HASH" == "$AFTER_HASH" ]] || {
  echo "ERROR: historical snapshot changed after transaction refresh" >&2
  exit 1
}
echo "PASS: historical snapshot remained unchanged after refresh"

echo "7/7 Checking snapshot ownership and source traceability"
request_json "$TEST_DIR/snapshot-list.json" GET \
  "$API_BASE/v1/plaid/financial-snapshots?passportId=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["passportId"])' "$TEST_DIR/snapshot-before.json")"
python3 - "$TEST_DIR/snapshot-list.json" "$SNAPSHOT_ID" "$BORROWER_ID" <<'PY'
import json, sys
with open(sys.argv[1]) as source:
    snapshots = json.load(source)
matches = [snapshot for snapshot in snapshots if snapshot["snapshotId"] == sys.argv[2]]
assert len(matches) == 1, "Snapshot was not returned exactly once"
assert matches[0]["borrowerId"] == sys.argv[3]
assert matches[0]["sourceItemIds"]
print(f"PASS: {len(snapshots)} versioned snapshot(s) linked to the passport")
PY

echo "PLAID V1 REGRESSION: PASS"
