# products/recurring.py
import time
from datetime import date, timedelta
from core.client import PlaidClient

def _create_public_token_transactions(client: PlaidClient, institution_id="ins_109508"):
    d = client.post("/sandbox/public_token/create", {
        "institution_id": institution_id,
        "initial_products": ["transactions"]
    })
    return d["public_token"]

def _exchange_public_token(client: PlaidClient, public_token: str):
    d = client.post("/item/public_token/exchange", {"public_token": public_token})
    return d["access_token"]

def _get_recurring(client: PlaidClient, access_token: str, retries: int = 15, sleep_s: float = 1.0):
    last_err = None
    for _ in range(retries):
        status, data = client.post_allow_error("/transactions/recurring/get", {
            "access_token": access_token
        })
        if status == 200 and "error_code" not in data:
            return data
        if data.get("error_code") == "PRODUCT_NOT_READY":
            last_err = data
            time.sleep(sleep_s)
            continue
        raise RuntimeError(f"Plaid error /transactions/recurring/get: {data}")
    raise RuntimeError(f"Recurring transactions not ready after polling. Last error: {last_err}")

def fetch(client: PlaidClient):
    # Create a transactions-only item for recurring
    public_token = _create_public_token_transactions(client)
    access_token = _exchange_public_token(client, public_token)

    # Poll until ready
    payload = _get_recurring(client, access_token)
    return [("plaid.recurring", payload)]
