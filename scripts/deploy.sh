#!/bin/bash
set -e

echo ">>> Deployment started..."

cd /home/ubuntu/app/backend

# Stop old containers (if any)
echo ">>> Stopping old containers..."
docker-compose down || true

# Build and start new containers
echo ">>> Building and starting new containers..."
docker-compose up -d --build

echo ">>> Deployment complete!"
