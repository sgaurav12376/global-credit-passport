#!/bin/bash

# Health check script to verify deployment success
# This script can be run locally or on the server to check if the deployment went well

set -e

echo "=========================================="
echo "Python Backend - Health Check Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:8000}"
MAX_RETRIES=12
RETRY_INTERVAL=5

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local description=$2
    
    echo -e "${YELLOW}Checking: $description${NC}"
    echo "  URL: $url"
    
    if response=$(curl -sfS -w "\n%{http_code}" "$url" 2>&1); then
        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')
        
        if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
            echo -e "${GREEN}✅ Status: $http_code${NC}"
            if [ -n "$body" ]; then
                echo "  Response: $body"
            fi
            return 0
        else
            echo -e "${RED}❌ Status: $http_code${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Failed to connect${NC}"
        return 1
    fi
}

# Function to check Docker container
check_docker_container() {
    local container_name=$1
    
    echo -e "${YELLOW}Checking Docker container: $container_name${NC}"
    
    if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        echo -e "${GREEN}✅ Container is running${NC}"
        
        # Check container health
        health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no-healthcheck")
        if [ "$health" != "no-healthcheck" ]; then
            echo "  Health Status: $health"
        fi
        
        # Show container stats
        echo "  Container Info:"
        docker ps --filter "name=$container_name" --format "    • Status: {{.Status}}\n    • Ports: {{.Ports}}"
        return 0
    else
        echo -e "${RED}❌ Container is not running${NC}"
        return 1
    fi
}

# Main health check
echo -e "${BLUE}Starting health checks...${NC}"
echo ""

# Check 1: Docker container (if running in Docker)
if command -v docker &> /dev/null; then
    if docker ps --format '{{.Names}}' | grep -q "python-backend"; then
        check_docker_container "python-backend"
        echo ""
    fi
fi

# Check 2: Root endpoint
echo -e "${BLUE}=== API Endpoint Checks ===${NC}"
echo ""

all_checks_passed=true

# Wait for service to be ready
echo -e "${YELLOW}Waiting for service to be ready...${NC}"
for i in $(seq 1 $MAX_RETRIES); do
    if curl -sfS "$API_URL/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Service is ready!${NC}"
        echo ""
        break
    else
        if [ $i -eq $MAX_RETRIES ]; then
            echo -e "${RED}❌ Service did not become ready within timeout${NC}"
            all_checks_passed=false
        else
            echo "  Attempt $i/$MAX_RETRIES - waiting ${RETRY_INTERVAL}s..."
            sleep $RETRY_INTERVAL
        fi
    fi
done

# Perform endpoint checks
echo ""

# Health endpoint (primary check)
if check_endpoint "$API_URL/health" "Health endpoint"; then
    echo ""
else
    all_checks_passed=false
    echo ""
fi

# Root endpoint
if check_endpoint "$API_URL/" "Root endpoint"; then
    echo ""
else
    echo -e "${YELLOW}⚠️  Root endpoint not available (this is optional)${NC}"
    echo ""
fi

# API docs endpoint
if check_endpoint "$API_URL/docs" "API Documentation"; then
    echo ""
else
    echo -e "${YELLOW}⚠️  API docs not available (this is optional)${NC}"
    echo ""
fi

# OpenAPI schema
if check_endpoint "$API_URL/openapi.json" "OpenAPI Schema"; then
    echo ""
else
    echo -e "${YELLOW}⚠️  OpenAPI schema not available (this is optional)${NC}"
    echo ""
fi

# Check 3: Test specific endpoints (if they exist)
echo -e "${BLUE}=== Testing API Endpoints ===${NC}"
echo ""

# Test auth endpoints (these might require authentication, so we just check if they exist)
endpoints=(
    "/auth/signin"
    "/auth/signup_manual"
    "/auth/signup_auto"
)

for endpoint in "${endpoints[@]}"; do
    url="${API_URL}${endpoint}"
    echo -e "${YELLOW}Testing: $endpoint${NC}"
    
    # Use HEAD request to check if endpoint exists without triggering side effects
    if curl -sfS -I "$url" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Endpoint exists${NC}"
    else
        # Try GET as fallback
        if curl -sfS "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Endpoint exists${NC}"
        else
            echo -e "${YELLOW}⚠️  Endpoint may require authentication or not be available${NC}"
        fi
    fi
    echo ""
done

# Summary
echo -e "${BLUE}=========================================="
if [ "$all_checks_passed" = true ]; then
    echo -e "${GREEN}✅ Health Check Summary: PASSED${NC}"
    echo -e "${GREEN}The Python backend appears to be running correctly!${NC}"
    exit 0
else
    echo -e "${RED}❌ Health Check Summary: FAILED${NC}"
    echo -e "${RED}Some checks failed. Please review the output above.${NC}"
    exit 1
fi
echo "==========================================${NC}"

