# main.py
# One simple runner. can run a single product or "all".
# Examples:
#   python main.py assets
#   python main.py auth
#   python main.py all

import sys
from core.db import get_engine, ensure_raw_table, insert_raw_event
from core.client import PlaidClient
from products import assets, auth, transactions, recurring, statements, identity, liabilities, investments, payrollincome

# Map CLI argument → product module
PRODUCTS = {
    "assets": assets,
    "auth": auth,
    "transactions": transactions,
    "recurring": recurring,
    "statements": statements,
    "identity": identity,
    "liabilities": liabilities,
    "investments": investments,
    "income_payroll": payrollincome,
}

def run(which: str):
    if which not in PRODUCTS and which != "all":
        print("Usage: python main.py [assets|auth|all]")
        raise SystemExit(1)

    # Setup once
    engine = get_engine()
    ensure_raw_table(engine)
    client = PlaidClient()

    # Choose which products to run
    modules = PRODUCTS.values() if which == "all" else [PRODUCTS[which]]

    # Fetch and store for each product
    for mod in modules:
        pairs = mod.fetch(client)  # returns list of (source, payload)
        for source, payload in pairs:
            row_id = insert_raw_event(engine, source=source, payload=payload)
            print(f"[{source}] saved raw row id={row_id}")

if __name__ == "__main__":
    # default = "all" if no argument given
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    run(arg)
