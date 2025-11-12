#!/bin/bash
set -e
echo "[AfterInstall] Building Docker image..."
TARGET_DIR="/home/ubuntu/app/synergy-backend/python"

cd "$TARGET_DIR" || exit 1

# ensure docker is available
if ! command -v docker >/dev/null 2>&1; then
  echo "[AfterInstall] docker binary not found! Exiting."
  exit 1
fi

# Build images using docker-compose (uses included Dockerfile)
# Use --pull if you prefer to pull base images
/usr/bin/docker-compose -f docker-compose.yml build --no-cache
echo "[AfterInstall] Docker build complete"