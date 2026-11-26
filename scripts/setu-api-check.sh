#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PROPS="$ROOT/synergy-backend/java/global-credit-app/passport-service/application-local.properties"

python3 - "$PROPS" <<'PY'
import sys
import json
import subprocess
from pathlib import Path

def fail(message):
    print("ERROR:", message)
    sys.exit(1)

path = Path(sys.argv[1])

if not path.is_file():
    fail("Local properties file not found.")

properties = {}

for line in path.read_text().splitlines():
    line = line.strip()
    if not line or line.startswith(("#", "!")):
        continue
    if "=" in line:
        key, value = line.split("=", 1)
        properties[key.strip()] = value.strip()

required = [
    "setu.client-id",
    "setu.client-secret",
    "setu.product-id"
]

for key in required:
    if not properties.get(key):
        fail(f"Missing property: {key}")
    print(f"{key}: configured")

def request(url, headers=None, payload=None):
    config = [
        "url = " + json.dumps(url),
        'socks5-hostname = "127.0.0.1:1080"',
        "silent",
        "show-error",
        "max-time = 25",
        'write-out = "\\n%{http_code}"'
    ]

    for key, value in (headers or {}).items():
        config.append(
            "header = " + json.dumps(f"{key}: {value}")
        )

    if payload is not None:
        config.append('request = "POST"')
        config.append(
            'header = "Content-Type: application/json"'
        )
        config.append(
            "data = " + json.dumps(json.dumps(payload))
        )

    result = subprocess.run(
        ["curl", "-q", "--config", "-"],
        input="\n".join(config) + "\n",
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        fail(f"Network request failed (curl exit {result.returncode}). Check Mumbai tunnel.")

    body, status = result.stdout.rsplit("\n", 1)
    return status, body

print("\n--- Mumbai connectivity ---")

status, body = request(
    "https://checkip.amazonaws.com"
)

print("HTTP status:", status)

if status != "200":
    fail("Mumbai connectivity check failed.")

print("Tunnel public IP:", body.strip())

print("\n--- Setu authentication ---")

status, body = request(
    "https://orgservice-prod.setu.co/v1/users/login",
    {"client": "bridge"},
    {
        "clientID": properties["setu.client-id"],
        "secret": properties["setu.client-secret"],
        "grant_type": "client_credentials"
    }
)

print("Authentication HTTP status:", status)

if status != "200":
    fail("Setu authentication failed.")

try:
    token = json.loads(body).get("access_token")
except (ValueError, AttributeError):
    fail("Unexpected authentication response.")

if not token:
    fail("No access token returned.")

print("Access token received: YES")

print("\n--- Setu FIP API ---")

status, body = request(
    "https://fiu-sandbox.setu.co/v2/fips",
    {
        "Authorization": "Bearer " + token,
        "x-product-instance-id":
            properties["setu.product-id"]
    }
)

print("FIP API HTTP status:", status)

if status != "200":
    fail("FIP API request failed.")

try:
    data = json.loads(body)
except ValueError:
    fail("FIP response is not valid JSON.")

if isinstance(data, list):
    print("FIP records returned:", len(data))
elif isinstance(data, dict):
    print("Response fields:", ", ".join(data.keys()))
    for key, value in data.items():
        if isinstance(value, list):
            print(f"{key}: {len(value)} records")

print("\nSETU AUTHENTICATED API CHECK: PASSED")

PY
