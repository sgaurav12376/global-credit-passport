#!/bin/bash
set -e
echo "[BeforeInstall] Stopping existing containers if any..."
TARGET_DIR="/home/ubuntu/app/synergy-backend/python"

# If docker-compose is already up in old path, stop gracefully
if [ -d "$TARGET_DIR" ]; then
  cd "$TARGET_DIR" || true
  if [ -f "docker-compose.yml" ]; then
    echo "[BeforeInstall] Running docker-compose down..."
    /usr/bin/docker-compose -f docker-compose.yml down || true
  else
    # fallback: try to stop container by name
    /usr/bin/docker ps -q --filter "name=python-backend" | xargs -r /usr/bin/docker stop || true
    /usr/bin/docker rm -f python-backend || true
  fi
fi

echo "[BeforeInstall] Clean up dangling images..."
/usr/bin/docker image prune -f || true