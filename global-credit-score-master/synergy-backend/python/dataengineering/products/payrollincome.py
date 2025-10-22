# products/payrollincome.py
import time, uuid
from core.client import PlaidClient

def _create_user(client: PlaidClient, client_user_id: str) -> str:
    d = client.post("/user/create", {"client_user_id": client_user_id})
    return d["user_token"]

def _poll_payroll_income(client: PlaidClient, user_token: str, retries: int = 15, sleep_s: float = 1.0):
    """
    Polls payroll income; handles PRODUCT_NOT_READY / INCOME_VERIFICATION_NOT_FOUND without crashing.
    Returns either the data or None if still not ready after retries.
    """
    last_err = None
    for _ in range(retries):
        status, data = client.post_allow_error("/credit/payroll_income/get", {"user_token": user_token})
        if status == 200 and "error_code" not in data:
            return data
        if data.get("error_code") in ("PRODUCT_NOT_READY", "INCOME_VERIFICATION_NOT_FOUND"):
            last_err = data
            time.sleep(sleep_s)
            continue
        # Unexpected error → stop polling and bubble up
        raise RuntimeError(f"Plaid error /credit/payroll_income/get: {data}")
    # Give up politely; caller can decide to skip saving
    return {"_polling_exhausted": True, "last_error": last_err}

def fetch(client: PlaidClient):
    # 1) Create sandbox user
    user_token = _create_user(client, client_user_id=str(uuid.uuid4()))

    # 2) Poll for payroll income readiness (no sandbox webhook calls here)
    data = _poll_payroll_income(client, user_token)

    # 3) If still not ready after retries, skip saving (don’t crash "all")
    if data is None or data.get("_polling_exhausted"):
        # Return an empty list so main.py moves on to the next product quietly
        print("[plaid.income.payroll] skipped: payroll data not ready in sandbox yet")
        return []
    return [("plaid.income.payroll", data)]
