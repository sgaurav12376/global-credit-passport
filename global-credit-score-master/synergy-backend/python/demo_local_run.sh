#!/bin/bash

# Demo script for running Python backend locally
# This script helps you test the Python backend before deploying

set -e

echo "=========================================="
echo "Python Backend - Local Demo Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${YELLOW}Step 1: Checking Python version...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3.10 or higher.${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo -e "${GREEN}✅ Python version: $(python3 --version)${NC}"

echo ""
echo -e "${YELLOW}Step 2: Checking for virtual environment...${NC}"
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo -e "${GREEN}✅ Virtual environment created${NC}"
else
    echo -e "${GREEN}✅ Virtual environment already exists${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3: Activating virtual environment...${NC}"
source venv/bin/activate
echo -e "${GREEN}✅ Virtual environment activated${NC}"

echo ""
echo -e "${YELLOW}Step 4: Installing/updating dependencies...${NC}"
pip install --upgrade pip
pip install -r requirements.txt
echo -e "${GREEN}✅ Dependencies installed${NC}"

echo ""
echo -e "${YELLOW}Step 5: Checking for .env file...${NC}"
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
    echo -e "${YELLOW}⚠️  Using default template for now (database connection may fail)${NC}"
    echo "Continuing with template .env file in 2 seconds..."
    sleep 2
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi

echo ""
echo -e "${YELLOW}Step 6: Checking database connection...${NC}"
# Extract database info from DATABASE_URL if present
if grep -q "DATABASE_URL" .env; then
    echo -e "${YELLOW}⚠️  Make sure your database is running and accessible${NC}"
    echo "You can test the connection once the app starts"
else
    echo -e "${YELLOW}⚠️  DATABASE_URL not found in .env${NC}"
fi

echo ""
echo -e "${YELLOW}Step 7: Starting FastAPI application...${NC}"
echo -e "${GREEN}🚀 Server will start on http://localhost:8000${NC}"
echo -e "${GREEN}📚 API docs will be available at http://localhost:8000/docs${NC}"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the application
uvicorn com.synergy_resources.credit_app.main.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload

