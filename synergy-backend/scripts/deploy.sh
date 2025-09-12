#!/bin/bash
set -ex

echo ">>> Deployment started..."

# Go to the deployed backend directory
cd /home/ubuntu/app/synergy-backend

# Stop old containers (ignore errors if none are running)
echo ">>> Stopping old containers..."
sudo docker-compose down || true

# Build and start new containers
echo ">>> Building and starting new containers..."
sudo docker-compose up -d --build

echo ">>> Deployment complete!"
