#!/bin/bash
set -e
echo "[AfterInstall] Building Docker image..."
TARGET_DIR="/home/ubuntu/app/synergy-backend/python"

cd "$TARGET_DIR" || exit 1

# Ensure docker is available
if ! command -v docker >/dev/null 2>&1; then
  echo "[AfterInstall] ERROR: docker binary not found! Exiting."
  exit 1
fi

# Ensure docker-compose is available
if ! command -v docker-compose >/dev/null 2>&1; then
  echo "[AfterInstall] ERROR: docker-compose not found! Exiting."
  exit 1
fi

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
  echo "[AfterInstall] ERROR: docker-compose.yml not found in $TARGET_DIR"
  exit 1
fi

# Check if Dockerfile exists
if [ ! -f "Dockerfile" ]; then
  echo "[AfterInstall] ERROR: Dockerfile not found in $TARGET_DIR"
  exit 1
fi

echo "[AfterInstall] Building Docker image (this may take a few minutes)..."
# Build images using docker-compose (uses included Dockerfile)
/usr/bin/docker-compose -f docker-compose.yml build --no-cache

if [ $? -eq 0 ]; then
  echo "[AfterInstall] ✅ Docker build completed successfully"
else
  echo "[AfterInstall] ❌ Docker build failed"
  exit 1
fi