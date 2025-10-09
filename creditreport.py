#!/usr/bin/env python3
# pip install requests sqlalchemy psycopg2-binary
import os, sys, re, uuid, json, traceback
from pathlib import Path
import requests
from sqlalchemy import text
from db import get_engine  # reuses your existing db.py

# ===============================
# CONFIG — edit ONLY these two:
# ===============================
TEST_NAME   = "OMPRAKASH GULAPPA BISNAL"   # 👈 change name here
TEST_MOBILE = "9019765828"             # 👈 change mobile here (10 digits, starts 6–9)

# --- Everything below can stay as-is ---

# Decentro (staging) endpoint
BASE_URL = "https://in.staging.decentro.tech"
ENDPOINT = "/v2/financial_services/credit_bureau/credit_report/summary"

# Headers (your working financial_services creds)
DECENTRO_CLIENT_ID       = "synergyresourcesgrp123"
DECENTRO_CLIENT_SECRET   = "uNOmXNWHzJQ7wStrCFYdoMrqjvDmXdAy"
DECENTRO_MODULE_SECRET   = "8Q4znH9w526rfl0Mt7jpgWtngwHvJcXb"   # financial_services module secret
DECENTRO_PROVIDER_SECRET = "zXU9JZz2RIjfuyImThPTeLNOIzjr0Bnu"   # provider secret (e.g., Equifax)

# Request body constants (keep these unless your task manager says otherwise)
CONSENT          = True
CONSENT_PURPOSE  = "for bank verification only"
INQUIRY_PURPOSE  = "PL"         # per your sample
DOCUMENT_TYPE    = "PAN"        # per your sample
DOCUMENT_ID      = "ACSPT1086D" # per your sample (change only if provider requires matching ID)

# Postgres connection (same as you’ve been using)
PG_HOST, PG_PORT, PG_DB = "localhost", 5433, "increditdata"
PG_USER, PG_PASS        = "postgres", "pooja"
os.environ["DATABASE_URL"] = f"postgresql+psycopg2://{PG_USER}:{PG_PASS}@{PG_HOST}:{PG_PORT}/{PG_DB}"

# ===============================

def mask(s: str) -> str:
    return s[:2] + "…" + s[-4:] if s else ""

def ensure_credit_report_summary_table(engine):
    ddl = """
    CREATE SCHEMA IF NOT EXISTS raw;
    CREATE TABLE IF NOT EXISTS raw.credit_report_summaries (
        id           BIGSERIAL PRIMARY KEY,
        received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        payload      JSONB       NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_cr_summaries_received_at ON raw.credit_report_summaries(received_at);
    CREATE INDEX IF NOT EXISTS ix_cr_summaries_payload_gin ON raw.credit_report_summaries USING GIN (payload);
    """
    with engine.begin() as conn:
        for stmt in [s for s in ddl.strip().split(";") if s.strip()]:
            conn.exec_driver_sql(stmt + ";")

def insert_credit_report_summary(engine, payload: dict) -> int:
    sql = text("""
        INSERT INTO raw.credit_report_summaries (received_at, payload)
        VALUES (NOW(), CAST(:payload AS JSONB))
        RETURNING id
    """)
    with engine.begin() as conn:
        return conn.execute(sql, {"payload": json.dumps(payload)}).scalar_one()

def main():
    print(f"[diag] Python: {sys.executable}")
    try: print(f"[diag] Script: {Path(__file__).resolve()}")
    except: pass
    print(f"[diag] CWD   : {Path.cwd().resolve()}")

    # quick mobile sanity check
    if not re.fullmatch(r"[6-9]\d{9}", TEST_MOBILE):
        sys.exit(f"TEST_MOBILE must be a 10-digit Indian mobile starting with 6–9, got: {TEST_MOBILE!r}")

    url = f"{BASE_URL}{ENDPOINT}"
    headers = {
        "client_id":       DECENTRO_CLIENT_ID,
        "client_secret":   DECENTRO_CLIENT_SECRET,
        "module_secret":   DECENTRO_MODULE_SECRET,    # financial_services
        "provider_secret": DECENTRO_PROVIDER_SECRET,  # provider (e.g., Equifax)
        "Content-Type":    "application/json",
    }

    body = {
        "reference_id":     uuid.uuid4().hex,  # new id each run
        "consent":          bool(CONSENT),
        "consent_purpose":  CONSENT_PURPOSE,
        "name":             TEST_NAME,
        "mobile":           TEST_MOBILE,
        "inquiry_purpose":  INQUIRY_PURPOSE,
        "document_type":    DOCUMENT_TYPE,
        "document_id":      DOCUMENT_ID,
    }

    print(f"[api] POST {url}")
    print(f"[api] Headers: client_id={mask(DECENTRO_CLIENT_ID)}, module_secret={mask(DECENTRO_MODULE_SECRET)}, provider_secret={mask(DECENTRO_PROVIDER_SECRET)}")
    print(f"[api] Body   : {{name={TEST_NAME!r}, mobile={TEST_MOBILE!r}, inquiry_purpose={INQUIRY_PURPOSE}, document_type={DOCUMENT_TYPE}, document_id={DOCUMENT_ID}}}")

    # call API
    status_code = 0
    try:
        resp = requests.post(url, headers=headers, json=body, timeout=45)
        status_code = resp.status_code
        data = resp.json() if "application/json" in (resp.headers.get("Content-Type") or "") else {"raw_text": resp.text}
    except requests.RequestException:
        traceback.print_exc()
        data = {"error": "request_exception", "traceback": traceback.format_exc()}

    # save to DB
    engine = get_engine()
    ensure_credit_report_summary_table(engine)
    rec = {"http": {"status_code": status_code, "url": url}, "request": body, "response": data}
    new_id = insert_credit_report_summary(engine, rec)
    print(f"[db] saved row id={new_id}")

    # print response
    print("[api] response:")
    print(json.dumps(data, indent=2, ensure_ascii=False))

    # helpful hint on common failures
    if isinstance(data, dict) and data.get("status") == "FAILURE":
        msg = data.get("message", "")
        if "Authentication failed" in msg:
            print("\n[hint] Check module_secret/provider_secret (must be the *financial_services* ones for this endpoint).")
        if "document" in msg.lower() or "id" in msg.lower():
            print("\n[hint] The PAN in document_id may need to match the person; if you see ID mismatch errors, update DOCUMENT_ID accordingly.")

if __name__ == "__main__":
    main()
