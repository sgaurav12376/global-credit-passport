#!/usr/bin/env python3
# pip install requests sqlalchemy psycopg2-binary
import os
import sys
import re
import uuid
import json
import traceback
import argparse
from pathlib import Path
from typing import Optional

import requests
from sqlalchemy import text

# ---- keep your existing db.py in the same project folder
from db import get_engine, ensure_raw_table, insert_raw_event

# =========================
# CONFIG — no .env required
# =========================

# Decentro (staging) API
DECENTRO_BASE_URL = "https://in.staging.decentro.tech"
DECENTRO_ENDPOINT = "/v2/financial_services/data/pull"

# Decentro credentials (keep safe)
DECENTRO_CLIENT_ID       = "synergyresourcesgrp123"
DECENTRO_CLIENT_SECRET   = "uNOmXNWHzJQ7wStrCFYdoMrqjvDmXdAy"
DECENTRO_MODULE_SECRET   = "8Q4znH9w526rfl0Mt7jpgWtngwHvJcXb"
DECENTRO_PROVIDER_SECRET = "zXU9JZz2RIjfuyImThPTeLNOIzjr0Bnu"

# Defaults (can be overridden with --name / --mobile)
TEST_NAME   = "DARSHAN GORDHAN"
TEST_MOBILE = "9996889976"  # must be 10 digits starting 6–9

# Consent text
CONSENT         = True
CONSENT_PURPOSE = "for bank verification only"

# Postgres connection (change if needed)
PG_HOST = "localhost"
PG_PORT = 5433
PG_DB   = "increditdata"
PG_USER = "postgres"
PG_PASS = "pooja"

# Build DB URL and feed it to db.py via environment
DATABASE_URL = f"postgresql+psycopg2://{PG_USER}:{PG_PASS}@{PG_HOST}:{PG_PORT}/{PG_DB}"
os.environ["DATABASE_URL"] = DATABASE_URL

# =========================
# Helpers
# =========================

def mask(v: Optional[str], show: int = 4) -> str:
    if not v:
        return ""
    v = v.strip().strip('"').strip("'")
    return v[:2] + "…" + v[-show:] if len(v) > show + 2 else v

def clean(v: Optional[str]) -> str:
    if v is None:
        return ""
    return v.strip().strip('"').strip("'")

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--name",   default=TEST_NAME,   help="Person name (default from file)")
    p.add_argument("--mobile", default=TEST_MOBILE, help="10-digit Indian mobile starting 6–9")
    return p.parse_args()

# =========================
# Main flow
# =========================

def main() -> None:
    # diagnostics
    print(f"[diag] Python: {sys.executable}")
    try:
        print(f"[diag] Script: {Path(__file__).resolve()}")
    except Exception:
        pass
    print(f"[diag] CWD   : {Path.cwd().resolve()}")

    # args (override defaults without editing the file)
    args = parse_args()
    name   = args.name
    mobile = args.mobile

    # API config & inputs
    base_url      = DECENTRO_BASE_URL.rstrip("/")
    endpoint_path = DECENTRO_ENDPOINT if DECENTRO_ENDPOINT.startswith("/") else "/" + DECENTRO_ENDPOINT

    headers = {
        "client_id":       DECENTRO_CLIENT_ID,
        "client_secret":   DECENTRO_CLIENT_SECRET,
        "module_secret":   DECENTRO_MODULE_SECRET,
        "provider_secret": DECENTRO_PROVIDER_SECRET,
        "Content-Type":    "application/json",
    }

    # Basic Indian mobile sanity check
    if not re.fullmatch(r"[6-9]\d{9}", mobile):
        sys.exit(f"TEST_MOBILE must be a 10-digit Indian mobile starting with 6–9, got: {mobile!r}")

    request_payload = {
        "reference_id": uuid.uuid4().hex,  # hex: no hyphens
        "consent": bool(CONSENT),
        "consent_purpose": CONSENT_PURPOSE,
        "name": name,
        "mobile": mobile,
    }

    url = f"{base_url}{endpoint_path}"
    print(f"[api] POST {url}")
    print(f"[api] Using creds: client_id={mask(DECENTRO_CLIENT_ID)}, module_secret={mask(DECENTRO_MODULE_SECRET)}, provider_secret={mask(DECENTRO_PROVIDER_SECRET)}")

    # Call API
    status_code = 0
    data: dict = {}
    try:
        resp = requests.post(url, headers=headers, json=request_payload, timeout=30)
        status_code = resp.status_code
        ctype = resp.headers.get("Content-Type") or ""
        if "application/json" in ctype:
            try:
                data = resp.json()
            except Exception:
                data = {"raw_text": resp.text}
        else:
            data = {"raw_text": resp.text}
    except requests.RequestException:
        print("[api] request failed:")
        traceback.print_exc()
        data = {"error": "request_exception", "traceback": traceback.format_exc()}

    # Save to Postgres no matter what
    try:
        engine = get_engine()
        with engine.connect() as conn:
            db, port = conn.execute(text("SELECT current_database(), inet_server_port()")).one()
            print(f"[db] connected to db={db}, port={port}")
        ensure_raw_table(engine)

        source = "decentro.financial_services.pull"
        db_payload = {
            "http": {"status_code": status_code, "url": url},
            "request": request_payload,
            "response": data,
        }
        new_id = insert_raw_event(engine, source, db_payload)
        print(f"[db] saved row id={new_id}")
    except Exception:
        print("[db] connection/insert failed:")
        traceback.print_exc()
        sys.exit(1)

    # Print response
    print("[api] response:")
    try:
        print(json.dumps(data, indent=2, ensure_ascii=False))
    except Exception:
        print(str(data))

    # Exit status
    if isinstance(data, dict) and data.get("status") == "FAILURE":
        print("\n[hint] Authentication failure is usually wrong creds vs environment (staging vs prod).")
        sys.exit(1)
    if status_code and status_code >= 400:
        sys.exit(1)

if __name__ == "__main__":
    main()
