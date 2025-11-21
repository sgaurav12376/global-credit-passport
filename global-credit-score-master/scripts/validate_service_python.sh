#!/bin/bash
set -e
echo "[ValidateService] Validating Python backend service..."

# Wait a bit for service to fully start
sleep 5

# Check if container is running
if ! /usr/bin/docker ps --format '{{.Names}}' | grep -q "^python-backend$"; then
  echo "[ValidateService] ERROR: python-backend container is not running"
  /usr/bin/docker ps -a | grep python-backend || true
  exit 1
fi

# Check health endpoint
for i in {1..10}; do
  if curl -sfS http://localhost:8000/health >/dev/null 2>&1; then
    echo "[ValidateService] ✅ Health check passed"
    echo "[ValidateService] Service is running and healthy"
    exit 0
  else
    echo "[ValidateService] Waiting for health endpoint... ($i/10)"
    sleep 2
  fi
done

echo "[ValidateService] ❌ Health check failed"
echo "[ValidateService] Container logs:"
/usr/bin/docker logs python-backend --tail 30 || true
exit 1

