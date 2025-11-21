#!/bin/bash
set -e
echo "[ApplicationStart] Starting application via docker-compose..."
TARGET_DIR="/home/ubuntu/app/synergy-backend/python"

cd "$TARGET_DIR" || exit 1

# Up the containers
/usr/bin/docker-compose -f docker-compose.yml up -d --remove-orphans

# Simple health check loop (adjust path/port as needed)
echo "[ApplicationStart] Waiting for health endpoint..."
for i in {1..30}; do
  if curl -sfS http://localhost:8000/health >/dev/null 2>&1; then
    echo "[ApplicationStart] Health check passed - service is ready"
    # Show container status
    /usr/bin/docker ps --filter "name=python-backend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    exit 0
  else
    echo "[ApplicationStart] Waiting for service to be ready... ($i/30)"
    sleep 2
  fi
done

echo "[ApplicationStart] Health check failed after timeout"
echo "[ApplicationStart] Checking container logs..."
/usr/bin/docker logs python-backend --tail 50 || true
exit 1