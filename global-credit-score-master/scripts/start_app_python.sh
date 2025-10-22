#!/bin/bash
set -e
echo "[ApplicationStart] Starting application via docker-compose..."
TARGET_DIR="/home/ubuntu/app/synergy-backend/python"

cd "$TARGET_DIR" || exit 1

# Up the containers
/usr/bin/docker-compose -f docker-compose.yml up -d --remove-orphans

# Simple health check loop (adjust path/port as needed)
echo "[ApplicationStart] Waiting for health endpoint..."
for i in {1..12}; do
  if curl -sfS http://localhost:8000/ >/dev/null 2>&1; then
    echo "[ApplicationStart] Health check passed"
    exit 0
  else
    echo "[ApplicationStart] Waiting... ($i/12)"
    sleep 5
  fi
done

echo "[ApplicationStart] Health check failed after timeout"
exit 1