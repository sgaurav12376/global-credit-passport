# products/identity.py
from core.client import PlaidClient
from .helpers import create_public_token, exchange_public_token

def fetch(client: PlaidClient):
    public_token = create_public_token(client, ["identity"])
    access_token = exchange_public_token(client, public_token)
    payload = client.post("/identity/get", {"access_token": access_token})
    return [("plaid.identity", payload)]
