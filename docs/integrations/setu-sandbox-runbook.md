# Setu AA sandbox operations runbook

Global Credit Passport™ | India → US pilot  
Baseline: 26 November 2026 | Scope: synthetic sandbox data only

## 1. Architecture and baseline

- Temporary Mumbai EC2 (`ap-south-1`), t3.micro, Amazon Linux 2023, encrypted disposable root volume, IMDSv2 required.
- `scripts/setu-demo-session.sh` provisions the instance and invokes `scripts/setu-mumbai-tunnel.sh` for SSH connectivity.
- Browser mode provides SOCKS5 at `127.0.0.1:1080`. Backend mode requires a separately deployed service; a browser tunnel does not automatically route Java traffic.
- Independent Mumbai API Gateway HTTP API (`setu-aa-sandbox-callback`, `$default` stage) invokes Lambda `setu-aa-sandbox-callback-receiver`. CloudWatch receives invocation logs.
- On 26 November: synthetic POST returned HTTP 200 `OK`; Lambda logged `sandbox_notification_received category=other` at 11:49:42 UTC. Duration 2.05 ms; no execution errors observed. This is not a genuine Setu notification.
- Earlier authenticated FIP listing returned HTTP 200 (123 institutions, 89 supporting DEPOSIT); counts can change. Repeat through the new tunnel is pending.

## 2. Prerequisites and safety

Mac Terminal, AWS CLI authenticated to the intended account, Python 3, curl, SSH and access to the repository. Use the approved Mumbai subnet, SSH key and dedicated security group allowing port 22 only from the operator's current public IPv4 /32. Do not widen ingress to bypass a failing preflight. Keep the private PEM outside Git with restricted permissions. Use only approved TEST credentials and synthetic identities. Confirm Setu authorizes the sandbox access arrangement; Mumbai egress is not a substitute for production FIU eligibility or Indian hosting requirements.

## 3. Start a session

From repository root:

```bash
bash -n scripts/setu-demo-session.sh && bash -n scripts/setu-mumbai-tunnel.sh
SETU_SESSION_MINUTES=30 bash scripts/setu-demo-session.sh plan browser
SETU_SESSION_MINUTES=30 bash scripts/setu-demo-session.sh start browser
```

Plan mode makes no AWS calls. Keep the start terminal open. New SSH host keys are accepted non-interactively; changed keys are rejected. Verify unexpected host-key changes independently rather than disabling checking. First-use acceptance is not independent host authentication.

In another terminal:

```bash
curl --max-time 15 --socks5-hostname 127.0.0.1:1080 https://checkip.amazonaws.com
curl --max-time 20 --socks5-hostname 127.0.0.1:1080 -sS -o /dev/null -w 'HTTP %{http_code}\n' https://fiu-sandbox.setu.co/v2/fips
```

Match the first result to the launched EC2 IP. An unauthenticated HTTP response establishes reachability, not authentication. HTTP 401 may be expected; 403 requires investigation; 000 indicates no HTTP response.

## 4. Authenticated sandbox smoke test

Use the approved Setu AA v2 token flow with TEST credentials and the correct product instance ID. Keep secrets and tokens out of shell history, logs, Git and frontend code. Load credentials using the existing approved local mechanism. Use the SOCKS5 tunnel for both authentication and FIP calls when required by the approved test setup. Request GET `/v2/fips` with the bearer token and `x-product-instance-id` header. Record status and counts only. Do not create consent during this smoke test. Exact local credential loading and token request commands must be verified before adding them to this runbook.

Expected: HTTP 200 and a parseable FIP list. HTTP 401: check token validity and environment; HTTP 403: check product authorization and access restrictions. Do not retry indefinitely.

## 5. Independent callback smoke test

No EC2 session is needed. From an authenticated AWS CLI terminal, run the following as a single Bash block (the route is retrieved dynamically and not printed). Stop if the expected single POST route or default stage is not present.

```bash
(
set -euo pipefail
region=ap-south-1
api_id=$(aws apigatewayv2 get-apis --region "$region" --query "Items[?Name=='setu-aa-sandbox-callback'].ApiId" --output text)
[[ "$api_id" =~ ^[a-z0-9]+$ ]]
route=$(aws apigatewayv2 get-routes --api-id "$api_id" --region "$region" --query 'Items[0].RouteKey' --output text)
[[ "$route" == 'POST /setu/aa/'* ]]
[[ "$(aws apigatewayv2 get-routes --api-id "$api_id" --region "$region" --query 'length(Items)' --output text)" == 1 ]]
aws apigatewayv2 get-stage --api-id "$api_id" --stage-name '$default' --region "$region" >/dev/null
endpoint=$(aws apigatewayv2 get-api --api-id "$api_id" --region "$region" --query ApiEndpoint --output text)
url="${endpoint}${route#POST }"
printf 'url = "%s"\n' "$url" | curl --config - --max-time 20 -sS --fail -w '\nHTTP %{http_code}\n' -H 'Content-Type: application/json' -d '{"test":true,"event":"GCP_CALLBACK_VALIDATION","source":"global-credit-passport","environment":"sandbox"}'
)
```

Expected: `OK` and HTTP 200. Then inspect invocation logs:

```bash
aws logs tail /aws/lambda/setu-aa-sandbox-callback-receiver --region ap-south-1 --since 10m --format short
```

Correlate UTC timestamp and invocation. Expect the synthetic event category `other`, START/END/REPORT and no execution errors. Do not log customer payloads or secrets. The random callback path is sensitive and is not adequate webhook authentication on its own; verify the genuine provider authentication mechanism before production. Rotate the route and update Setu if it has been exposed outside authorized channels.

## 6. End session and verify cleanup

Press Ctrl+C in the main session terminal. Expect `Confirmed terminated: i-...`. The main session script performs EC2 cleanup; standalone tunnel helper usage only closes SSH. Guest shutdown is a fallback configured at launch, not a guarantee if guest initialization fails.

Check for remaining demo instances:

```bash
aws ec2 describe-instances --region ap-south-1 --filters Name=tag:Application,Values=gcp-setu-demo Name=instance-state-name,Values=pending,running,stopping,stopped,shutting-down --query 'Reservations[].Instances[].{Id:InstanceId,State:State.Name}' --output table
```

If any remain, inspect the session tag and instance ID in the Mumbai console and terminate the intended demo instance after confirming ownership. Do not terminate unrelated workloads. Keep API Gateway and Lambda deployed for sandbox callbacks; review log retention and AWS charges.

## 7. Evidence and next milestones

| Milestone | Baseline status |
|---|---|
| Automated provisioning, SSH, manual cleanup | Tested and committed (operator reported) |
| Guest TTL fallback | Configured; independent expiry test not evidenced |
| Synthetic callback and CloudWatch logging | Passed 26 Nov 2026 |
| Authenticated FIP list | Previously passed; repeat through new tunnel pending |
| Genuine consent approval and notification authentication | Pending |
| Financial data retrieval and normalization | Pending |
| Java backend integration and approved production FIU model | Pending |

Record test date, result, redacted error code/trace ID and next action. Never commit raw callback URLs, credentials, access tokens, PEMs, borrower identifiers or financial data. Production requires separate FIU eligibility, partner agreements, hosting, security and privacy review.

References: https://docs.setu.co/data/account-aggregator/quickstart ; https://docs.setu.co/data/account-aggregator/api-integration/fip-apis ; https://docs.setu.co/data/account-aggregator/api-integration/consent-flow

## Validation milestone — November 26, 2026

### Configuration

- Setu Bridge TEST credentials are stored in the existing
  Git-ignored passport-service/application-local.properties.
- Local credential file permissions restricted to 600.
- Setu borrower sandbox feature remains disabled by default.
- No separate Setu environment file is required.

### Authenticated API diagnostics

Run from the repository root with an active Mumbai browser tunnel:

    bash scripts/setu-api-check.sh

Verified results:

- Mumbai network connectivity: HTTP 200.
- Setu authentication: HTTP 200.
- Access token generation: successful.
- Authenticated FIP API: HTTP 200.
- Financial institution records returned: 127.
- Diagnostic script committed in a8bb561.

### Application regression validation

- SandboxFlowTest: 4 passed, 0 failures.
- Full passport-service regression: 64 passed, 0 failures,
  0 errors, 0 skipped.
- Frontend TypeScript and Vite production build: successful.
- Frontend modules transformed: 658.

### Remaining validation

- Provider-specific Java backend Mumbai egress.
- Confirmed synthetic test VUA and transaction date range.
- Live consent creation and borrower approval.
- Genuine Setu notification authentication.
- Live financial data retrieval and normalization.

These results validate sandbox infrastructure, authenticated
connectivity and existing automated tests. They do not establish
production readiness or regulatory eligibility.

## Java transport validation — November 27, 2026

### Implementation

- OkHttp JVM 5.5.1 introduced exclusively for Setu.
- Dedicated SetuHttpClient supports SOCKS5 and DIRECT modes.
- SandboxGateway migrated to the dedicated transport.
- No global JVM proxy configuration.
- No Privoxy or additional local proxy process required.
- Automatic connection retries and redirects disabled.
- Existing provider implementations remain unchanged.

### Local development configuration

In the Git-ignored passport-service/application-local.properties:

    setu.network.mode=SOCKS5
    setu.proxy.host=127.0.0.1
    setu.proxy.port=1080

Reuse the existing temporary Mumbai SSH session.

### Future AWS Mumbai deployment

    setu.network.mode=DIRECT

Direct cloud connectivity requires separate deployment validation
and applicable Setu onboarding and regulatory approvals.

### Verified results

- Existing backend regression: 64 tests passed.
- Seven new transport tests passed.
- Combined regression: 71 tests passed.
- Live Java public IP matched Mumbai EC2.
- Java Setu authentication successful.
- Authenticated FIP retrieval successful.
- 127 financial institution records returned.
- Live connectivity test passed.
- Tunnel unavailable test returned Connection refused.
- Authentication did not proceed after failed egress verification.

### Reusable Java diagnostic

Run from passport-service with an active authorized Mumbai tunnel:

    mvn -Dtest=SetuLiveConnectivityTest \
      -Dsetu.live.check=true \
      -Dsetu.expected.egress.ip="$MUMBAI_IP" test

Set MUMBAI_IP to the current EC2 public IP before running.

The live diagnostic is disabled during ordinary regression tests.

### Remaining validation

- Independent verification of remote DNS resolution.
- Direct connectivity from the deployed Mumbai backend.
- Confirmed synthetic borrower VUA and transaction date range.
- Live consent lifecycle and financial data retrieval.
- Financial data normalization and evidence integration.
- Production FIU eligibility and regional data governance.
