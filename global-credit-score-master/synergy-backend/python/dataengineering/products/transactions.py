# products/transactions.py
import time
from datetime import date, timedelta
from core.client import PlaidClient
from .helpers import create_public_token, exchange_public_token

def _get_all_transactions(client: PlaidClient, access_token: str, start_date: str, end_date: str,
                          retries: int = 12, sleep_s: float = 1.0):
    for attempt in range(retries):
        status, data = client.post_allow_error("/transactions/get", {
            "access_token": access_token,
            "start_date": start_date,
            "end_date": end_date,
            "options": {"count": 100, "offset": 0}
        })

        if status == 200 and "error_code" not in data:
            # Got valid data
            all_txns, offset, count = [], 0, 100
            item = data.get("item", {})
            total = data.get("total_transactions", len(data.get("transactions", [])))
            all_txns.extend(data.get("transactions", []))
            while len(all_txns) < total:
                d = client.post("/transactions/get", {
                    "access_token": access_token,
                    "start_date": start_date,
                    "end_date": end_date,
                    "options": {"count": count, "offset": offset + count}
                })
                item = d.get("item", item)
                all_txns.extend(d.get("transactions", []))
                offset += count
            return {"item": item, "transactions": all_txns}

        if data.get("error_code") == "PRODUCT_NOT_READY":
            time.sleep(sleep_s)
            continue

        raise RuntimeError(f"Plaid error /transactions/get: {data}")

    raise RuntimeError("Transactions not ready after polling.")

def fetch(client: PlaidClient, days: int = 30):
    end = date.today()
    start = end - timedelta(days=days)

    # Create item with only transactions
    public_token = create_public_token(client, ["transactions"])
    access_token = exchange_public_token(client, public_token)

    payload = _get_all_transactions(client, access_token, start.isoformat(), end.isoformat())
    return [("plaid.transactions", payload)]
