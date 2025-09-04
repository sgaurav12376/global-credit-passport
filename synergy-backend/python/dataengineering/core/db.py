# core/db.py
# ONE place for DB connection + a single raw.events table.

import os
import json
from sqlalchemy import create_engine, text

def get_engine():
    """
    Create a SQLAlchemy engine from DATABASE_URL in .env
    e.g. postgresql+psycopg2://user:pass@localhost:5432/credit_score
    """
    url = os.getenv("DATABASE_URL")
    if not url:
        raise ValueError("Missing DATABASE_URL in .env")
    return create_engine(url, pool_pre_ping=True, future=True)

# We keep ALL raw API payloads in one table: raw.events
DDL = """
CREATE SCHEMA IF NOT EXISTS raw;

CREATE TABLE IF NOT EXISTS raw.events (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL,                -- e.g. 'plaid.assets' or 'plaid.auth'
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload     JSONB NOT NULL                -- full API JSON
);

CREATE INDEX IF NOT EXISTS ix_raw_events_source      ON raw.events(source);
CREATE INDEX IF NOT EXISTS ix_raw_events_received_at ON raw.events(received_at);
CREATE INDEX IF NOT EXISTS ix_raw_events_payload_gin ON raw.events USING GIN (payload jsonb_path_ops);
"""

def ensure_raw_table(engine):
    """Create raw.events if it doesn't exist."""
    with engine.begin() as conn:
        conn.execute(text(DDL))

def insert_raw_event(engine, source: str, payload: dict) -> int:
    """
    Insert one full API payload into raw.events and return the new row id.
    """
    sql = text("""
        INSERT INTO raw.events(source, payload)
        VALUES (:s, CAST(:p AS JSONB))
        RETURNING id
    """)
    with engine.begin() as conn:
        row = conn.execute(sql, {"s": source, "p": json.dumps(payload)}).fetchone()
        return int(row[0])
