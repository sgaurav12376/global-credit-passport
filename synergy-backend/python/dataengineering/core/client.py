# core/client.py
import os
import requests
from dotenv import load_dotenv

load_dotenv()

PLAID_BASE = os.getenv("PLAID_ENV", "https://sandbox.plaid.com")
CLIENT_ID  = os.getenv("PLAID_CLIENT_ID")
SECRET     = os.getenv("PLAID_SECRET")

class PlaidClient:
    def __init__(self, base=PLAID_BASE, client_id=CLIENT_ID, secret=SECRET, timeout=30):
        self.base = base
        self.client_id = client_id
        self.secret = secret
        self.timeout = timeout

    def post(self, path: str, payload: dict):
        """Strict request: raises RuntimeError if Plaid returns an error."""
        body = dict(payload or {})
        body["client_id"] = self.client_id
        body["secret"] = self.secret

        res = requests.post(self.base + path, json=body, timeout=self.timeout)
        data = res.json()

        if res.status_code != 200 or ("error_code" in data):
            raise RuntimeError(f"Plaid error {path}: {data}")

        return data

    def post_allow_error(self, path: str, payload: dict):
        """Lenient request: returns (status, data) even if Plaid says error."""
        body = dict(payload or {})
        body["client_id"] = self.client_id
        body["secret"] = self.secret

        res = requests.post(self.base + path, json=body, timeout=self.timeout)
        return res.status_code, res.json()
