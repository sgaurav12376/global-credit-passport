# products/statements.py
from datetime import date, timedelta
from core.client import PlaidClient
from .helpers import create_public_token, exchange_public_token

def fetch(client: PlaidClient, months_back: int = 12):
    end = date.today()
    start = end - timedelta(days=30*months_back)
    options = {"statements": {"start_date": start.isoformat(), "end_date": end.isoformat()}}
    public_token = create_public_token(client, ["transactions", "statements"], options=options)
    access_token = exchange_public_token(client, public_token)
    payload = client.post("/statements/list", {"access_token": access_token})
    return [("plaid.statements", payload)]
