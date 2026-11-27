# India account launch (sandbox only)
Disabled by default. No real customer identity, production switch, webhook trust, raw transaction storage, publication or scoring. This single-process pilot keeps consent/session IDs in memory for up to 256 drafts until service restart. Reloading a page resumes an attempt; restarting the backend does not. Never use this fixed test identity in a public deployment.

## Local verification without AWS
Run mvn test from passport-service and npm run build from synergy-frontend. SandboxFlowTest simulates provider responses; it does not require credentials or a tunnel. Run the mock preview separately if installed. Disable/remove the old preview before borrower-facing trials to avoid two cards.

## When the mock identity is confirmed
Use an authenticated private sandbox deployment with backend egress in Mumbai. The Chrome SSH proxy is not automatically used by Java. Keep local-auth development servers private. Do not open your development API to the internet.
Configure Setu in the existing Git-ignored
`passport-service/application-local.properties` file
for local development:

- `setu.sandbox.enabled=false`: enable only for an authorized private sandbox trial.
- `setu.client-id`: Bridge TEST client ID.
- `setu.client-secret`: Bridge TEST client secret.
- `setu.product-id`: Bridge TEST product instance ID.
- `setu.test-vua`: confirmed mock identity only.
- `setu.data-from`, `setu.data-to`: ISO UTC instants covering the supplied mock deposit transactions.
- `setu.return-url`: exact browser-accessible GCP frontend URL ending in /passport-init (same browser origin as launch). Register it as the sandbox redirect in Bridge. The notification callback is a different URL.

The tracked `application-local.example.properties`
contains empty placeholders. Never commit actual credentials.

Spring Boot environment variables remain an alternative
for hosted deployments.

For independent authentication and FIP connectivity
validation, run `scripts/setu-api-check.sh` with an
active authorized Mumbai SOCKS5 session.

This diagnostic does not require enabling the borrower
workflow.

Only the frontend flag VITE_SETU_SANDBOX_ENABLED=true belongs in the frontend environment; restart Vite or rebuild.

Open an editable India-origin passport draft at Financial information. Connect India account creates consent, remembers step 3 and opens the sandbox approval URL. Returning on the same browser restores the draft and asks the backend to check the saved consent. URL query parameters never authorize a fetch. Refresh status resumes polling if it times out. Only a completed matching session containing an account transaction array qualifies as connected (the array may be empty). No separate callback infrastructure is required for this polling path. A failed one-time fetch needs a new consent. The user can resume an existing pending consent. Finish sandbox testing and remove temporary AWS resources separately.


## Provider-specific Java network routing

Setu uses a dedicated OkHttp transport.

For authorized local sandbox development:

    setu.network.mode=SOCKS5
    setu.proxy.host=127.0.0.1
    setu.proxy.port=1080

For an authorized AWS Mumbai deployment:

    setu.network.mode=DIRECT

The network mode must be explicitly configured.
SOCKS5 mode does not intentionally fall back to direct connectivity.

No Privoxy or global JVM proxy configuration is required.
Other GCP provider clients retain their existing network routing.

See docs/integrations/setu-sandbox-runbook.md for live Java
connectivity diagnostics and validation results.
