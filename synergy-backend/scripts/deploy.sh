#!/bin/bash
set -ex

echo ">>> Deployment started..."

APP_DIR="/home/ubuntu/app"
cd $APP_DIR

echo ">>> Stopping old containers..."
docker compose down || true   # use 'docker-compose' if your system doesn't support 'docker compose'

echo ">>> Building and starting new containers..."
docker compose up -d --build

echo ">>> Deployment complete!"
