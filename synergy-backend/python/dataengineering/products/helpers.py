# products/_helpers.py
from typing import List, Optional, Dict, Any
from core.client import PlaidClient

def create_public_token(client: PlaidClient, products: List[str], institution_id="ins_109508", options: Optional[Dict[str, Any]] = None) -> str:
    body = {"institution_id": institution_id, "initial_products": products}
    if options:
        body["options"] = options
    d = client.post("/sandbox/public_token/create", body)
    return d["public_token"]

def exchange_public_token(client: PlaidClient, public_token: str) -> str:
    d = client.post("/item/public_token/exchange", {"public_token": public_token})
    return d["access_token"]
