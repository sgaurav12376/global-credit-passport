# products/assets.py
# ------------------
# Only the product-specific steps for Assets.
# Everything common (HTTP, DB) is reused from core/.

import time
from core.client import PlaidClient

def _create_public_token_assets(client: PlaidClient, institution_id="ins_109508"):
    # Make a sandbox public_token for the "assets" product
    d = client.post("/sandbox/public_token/create", {
        "institution_id": institution_id,
        "initial_products": ["assets"],
    })
    return d["public_token"]

def _exchange_public_token(client: PlaidClient, public_token: str):
    # Exchange public_token for access_token
    d = client.post("/item/public_token/exchange", {"public_token": public_token})
    return d["access_token"]

def _create_asset_report(client: PlaidClient, access_token: str, days_requested=30):
    # Ask Plaid to build the Asset Report
    d = client.post("/asset_report/create", {
        "access_tokens": [access_token],
        "days_requested": days_requested,
        "options": {"client_report_id": "demo-report"}
    })
    return d["asset_report_token"]

def _get_asset_report(client: PlaidClient, asset_report_token: str, include_insights=True):
    # Fetch the Asset Report (may need retries while report is being prepared)
    return client.post("/asset_report/get", {
        "asset_report_token": asset_report_token,
        "include_insights": include_insights
    })

def fetch(client: PlaidClient, retries=10, sleep_s=1.0):
    """
    The pipeline runner calls this.
    Return: list of (source, payload) tuples to be saved.
    """
    # 1) Get access_token
    public_token = _create_public_token_assets(client)
    access_token = _exchange_public_token(client, public_token)

    # 2) Create report, then poll until it's ready
    report_token = _create_asset_report(client, access_token)

    last_error = None
    for _ in range(retries):
        try:
            report = _get_asset_report(client, report_token, include_insights=True)
            # We return a list so the same pattern works for products that yield multiple payloads
            return [("plaid.assets", report)]
        except RuntimeError as e:
            # Usually "ASSET_REPORT_NOT_READY" → wait and retry
            last_error = e
            time.sleep(sleep_s)

    # If still failing after retries, bubble up the last error
    raise last_error if last_error else RuntimeError("Asset report not ready")
