# products/liabilities.py
from core.client import PlaidClient
from .helpers import create_public_token, exchange_public_token

def fetch(client: PlaidClient):
    public_token = create_public_token(client, ["liabilities"])
    access_token = exchange_public_token(client, public_token)
    payload = client.post("/liabilities/get", {"access_token": access_token})
    return [("plaid.liabilities", payload)]
