#!/bin/bash
set -e

cd /home/ubuntu/app/backend

# Stop old containers
docker-compose down || true

# Build and run new containers
docker-compose up -d --build
