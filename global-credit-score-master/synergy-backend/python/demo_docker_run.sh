#!/bin/bash

# Demo script for running Python backend locally using Docker
# This script mimics the production deployment environment

set -e

echo "=========================================="
echo "Python Backend - Docker Local Demo"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${YELLOW}Step 1: Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker: $(docker --version)${NC}"
echo -e "${GREEN}✅ Docker Compose: $(docker-compose --version)${NC}"

echo ""
echo -e "${YELLOW}Step 2: Checking for .env file...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating template...${NC}"
    cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/credit_app_db

# AWS Configuration (if needed)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Application Configuration
ENVIRONMENT=local
DEBUG=true
EOF
    echo -e "${YELLOW}⚠️  Please update .env file with your actual configuration${NC}"
    echo "Press Enter to continue after updating .env file, or Ctrl+C to exit..."
    read
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3: Stopping any existing containers...${NC}"
docker-compose down 2>/dev/null || true
echo -e "${GREEN}✅ Cleaned up existing containers${NC}"

echo ""
echo -e "${YELLOW}Step 4: Building Docker image...${NC}"
docker-compose build --no-cache
echo -e "${GREEN}✅ Docker image built successfully${NC}"

echo ""
echo -e "${YELLOW}Step 5: Starting containers...${NC}"
docker-compose up -d
echo -e "${GREEN}✅ Containers started${NC}"

echo ""
echo -e "${BLUE}=========================================="
echo "Container Status:"
echo "==========================================${NC}"
docker-compose ps

echo ""
echo -e "${YELLOW}Step 6: Waiting for application to be ready...${NC}"
echo "Checking health endpoint..."
for i in {1..30}; do
    if curl -sfS http://localhost:8000/ >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Application is ready!${NC}"
        break
    else
        echo "Waiting... ($i/30)"
        sleep 2
    fi
    
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Application failed to start within timeout${NC}"
        echo "Checking logs..."
        docker-compose logs --tail=50
        exit 1
    fi
done

echo ""
echo -e "${GREEN}=========================================="
echo "✅ Python Backend is running!"
echo "==========================================${NC}"
echo ""
echo -e "${BLUE}📍 API Endpoints:${NC}"
echo "   • Root: http://localhost:8000"
echo "   • API Docs: http://localhost:8000/docs"
echo "   • Health Check: http://localhost:8000/"
echo ""
echo -e "${BLUE}📋 Useful Commands:${NC}"
echo "   • View logs: docker-compose logs -f"
echo "   • Stop: docker-compose down"
echo "   • Restart: docker-compose restart"
echo "   • View status: docker-compose ps"
echo ""
echo -e "${YELLOW}To view logs in real-time, run:${NC}"
echo "   docker-compose logs -f python-backend"

