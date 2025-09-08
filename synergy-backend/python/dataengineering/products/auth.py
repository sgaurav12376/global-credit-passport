# products/auth.py
# ----------------
# Only the product-specific steps for Auth + Accounts.

from core.client import PlaidClient

def _create_public_token_auth(client: PlaidClient, institution_id="ins_109508"):
    # Make a sandbox public_token for the "auth" product
    d = client.post("/sandbox/public_token/create", {
        "institution_id": institution_id,
        "initial_products": ["auth"]
    })
    return d["public_token"]

def _exchange_public_token(client: PlaidClient, public_token: str):
    # Exchange public_token for access_token
    d = client.post("/item/public_token/exchange", {"public_token": public_token})
    return d["access_token"]

def _get_accounts(client: PlaidClient, access_token: str):
    # Pull accounts
    return client.post("/accounts/get", {"access_token": access_token})

def _get_auth(client: PlaidClient, access_token: str):
    # Pull auth data (routing/account numbers etc in sandbox)
    return client.post("/auth/get", {"access_token": access_token})

def fetch(client: PlaidClient):
    """
    The pipeline runner calls this.
    Return: list of (source, payload) tuples to be saved.
    """
    public_token = _create_public_token_auth(client)
    access_token = _exchange_public_token(client, public_token)

    accounts_json = _get_accounts(client, access_token)
    auth_json     = _get_auth(client, access_token)

    # Return both payloads; the runner will insert both into raw.events
    return [
        ("plaid.accounts", accounts_json),
        ("plaid.auth",     auth_json),
    ]
