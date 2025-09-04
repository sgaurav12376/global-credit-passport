# products/investments.py
import time
from datetime import date, timedelta
from core.client import PlaidClient
from .helpers import create_public_token, exchange_public_token

def _get_all_investment_txns(client: PlaidClient, access_token: str,
                             start_date: str, end_date: str,
                             retries: int = 15, sleep_s: float = 1.0):
    last_err = None
    # first request with polling until product is ready
    for _ in range(retries):
        status, data = client.post_allow_error("/investments/transactions/get", {
            "access_token": access_token,
            "start_date": start_date,
            "end_date": end_date,
            "options": {"count": 100, "offset": 0}
        })
        if status == 200 and "error_code" not in data:
            # paginate
            all_txns, offset, count = [], 0, 100
            item = data.get("item", {})
            total = data.get("total_investment_transactions",
                             len(data.get("investment_transactions", [])))
            all_txns.extend(data.get("investment_transactions", []))
            securities = data.get("securities", [])
            while len(all_txns) < total:
                d = client.post("/investments/transactions/get", {
                    "access_token": access_token,
                    "start_date": start_date,
                    "end_date": end_date,
                    "options": {"count": count, "offset": offset + count}
                })
                item = d.get("item", item)
                all_txns.extend(d.get("investment_transactions", []))
                securities = d.get("securities", securities)
                offset += count
            return {"item": item, "investment_transactions": all_txns, "securities": securities}
        if data.get("error_code") == "PRODUCT_NOT_READY":
            last_err = data; time.sleep(sleep_s); continue
        raise RuntimeError(f"Plaid error /investments/transactions/get: {data}")
    raise RuntimeError(f"Investments not ready after polling. Last error: {last_err}")

def fetch(client: PlaidClient, days: int = 90):
    end = date.today()
    start = end - timedelta(days=days)
    public_token = create_public_token(client, ["investments"])
    access_token = exchange_public_token(client, public_token)
    payload = _get_all_investment_txns(client, access_token, start.isoformat(), end.isoformat())
    return [("plaid.investments.transactions", payload)]
