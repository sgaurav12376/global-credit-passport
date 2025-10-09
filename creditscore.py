#!/usr/bin/env python3
# pip install requests sqlalchemy psycopg2-binary
import os, sys, re, json, traceback
from pathlib import Path
import requests
from sqlalchemy import text
from db import get_engine  # reuse your db.py

# ===============================
# CONFIG — mirrors your Postman
# ===============================
BASE_URL = "https://in.staging.decentro.tech"
ENDPOINT = "/v2/bytes/credit-score"

DECENTRO_CLIENT_ID     = "synergyresourcesgrp123"
DECENTRO_CLIENT_SECRET = "uNOmXNWHzJQ7wStrCFYdoMrqjvDmXdAy"

# NO module_secret, NO provider_secret for this endpoint (per your Postman success)

# Change these per run
TEST_NAME   = "OMPRAKASH GULAPPA  BISNAL"
TEST_MOBILE = "901976582"  # 10 digits, starts 6–9

# DB (same as before)
PG_HOST, PG_PORT, PG_DB = "localhost", 5433, "increditdata"
PG_USER, PG_PASS        = "postgres", "pooja"
os.environ["DATABASE_URL"] = f"postgresql+psycopg2://{PG_USER}:{PG_PASS}@{PG_HOST}:{PG_PORT}/{PG_DB}"

# ===============================

def mask(s: str) -> str:
    return s[:2] + "…" + s[-4:] if s else ""

def ensure_credit_scores_table(engine):
    ddl = """
    CREATE SCHEMA IF NOT EXISTS raw;
    CREATE TABLE IF NOT EXISTS raw.credit_scores (
        id           BIGSERIAL PRIMARY KEY,
        received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        payload      JSONB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ix_credit_scores_received_at ON raw.credit_scores(received_at);
    CREATE INDEX IF NOT EXISTS ix_credit_scores_payload_gin ON raw.credit_scores USING GIN (payload);
    """
    with engine.begin() as conn:
        for stmt in [s for s in ddl.strip().split(";") if s.strip()]:
            conn.exec_driver_sql(stmt + ";")

def insert_credit_score(engine, payload: dict) -> int:
    sql = text("""
        INSERT INTO raw.credit_scores (received_at, payload)
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

    if not re.fullmatch(r"[6-9]\d{9}", TEST_MOBILE):
        sys.exit(f"TEST_MOBILE must be a 10-digit Indian mobile starting with 6–9, got: {TEST_MOBILE!r}")

    url = f"{BASE_URL}{ENDPOINT}"
    headers = {
        "client_id":     DECENTRO_CLIENT_ID,
        "client_secret": DECENTRO_CLIENT_SECRET,
        "Content-Type":  "application/json",
    }
    body = {"mobile": TEST_MOBILE, "name": TEST_NAME}

    print(f"[api] POST {url}")
    print(f"[api] Headers: client_id={mask(DECENTRO_CLIENT_ID)}, client_secret={mask(DECENTRO_CLIENT_SECRET)}")
    print(f"[api] Body   : {body}")

    status_code = 0
    try:
        resp = requests.post(url, headers=headers, json=body, timeout=30)
        status_code = resp.status_code
        if "application/json" in (resp.headers.get("Content-Type") or ""):
            data = resp.json()
        else:
            data = {"raw_text": resp.text}
    except requests.RequestException:
        traceback.print_exc()
        data = {"error": "request_exception", "traceback": traceback.format_exc()}

    # Save to DB
    engine = get_engine()
    ensure_credit_scores_table(engine)
    rec = {"http": {"status_code": status_code, "url": url}, "request": body, "response": data}
    new_id = insert_credit_score(engine, rec)
    print(f"[db] saved row id={new_id}")

    print("[api] response:")
    print(json.dumps(data, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
