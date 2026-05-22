#!/bin/bash

# CryptoBOM SaaS Validation Script
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8080"
FAILED_TESTS=0
TOTAL_TESTS=0
SERVER_EDITION="unknown"

echo -e "${BLUE}🔍 CryptoBOM SaaS Validation Script${NC}"
echo "====================================="

if health_response=$(curl -s "$BASE_URL/healthz" 2>/dev/null); then
    if echo "$health_response" | grep -q '"edition":"Open Source"'; then
        SERVER_EDITION="oss"
    elif echo "$health_response" | grep -q '"edition":"Enterprise"'; then
        SERVER_EDITION="enterprise"
    else
        SERVER_EDITION="default"
    fi
fi

echo -e "${BLUE}Detected server edition: ${SERVER_EDITION}${NC}"

# Test function
test_endpoint() {
    local name="$1"
    local endpoint="$2"
    local expected_status="$3"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing $name... "
    
    if response=$(curl -s -w "%{http_code}" "$BASE_URL$endpoint" 2>/dev/null); then
        status_code="${response: -3}"
        body="${response%???}"
        
        if [ "$status_code" = "$expected_status" ]; then
            echo -e "${GREEN}✅ PASS${NC} (HTTP $status_code)"
            if [ -n "$body" ] && [ "$body" != "null" ]; then
                echo "   Response: $(echo "$body" | head -c 100)..."
            fi
        else
            echo -e "${RED}❌ FAIL${NC} (Expected $expected_status, got $status_code)"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        echo -e "${RED}❌ FAIL${NC} (Connection failed)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

skip_test() {
    local name="$1"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "Testing $name... ${YELLOW}⚠️ SKIP${NC} (Not available for ${SERVER_EDITION} edition)"
}

# Test data creation
test_post_endpoint() {
    local name="$1"
    local endpoint="$2"
    local data="$3"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing $name... "
    
    if response=$(curl -s -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint" 2>/dev/null); then
        status_code="${response: -3}"
        body="${response%???}"
        
        if [ "$status_code" = "200" ] || [ "$status_code" = "201" ]; then
            echo -e "${GREEN}✅ PASS${NC} (HTTP $status_code)"
        else
            echo -e "${RED}❌ FAIL${NC} (Expected 200/201, got $status_code)"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        echo -e "${RED}❌ FAIL${NC} (Connection failed)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo -e "${YELLOW}📊 Testing Core Health Endpoints${NC}"
test_endpoint "Health Check" "/healthz" "200"

echo -e "\n${YELLOW}🔐 Testing Crypto Asset Endpoints${NC}"
test_endpoint "List Assets" "/api/v1/assets" "200"
test_endpoint "Get Asset Details" "/api/v1/assets/1" "200"

echo -e "\n${YELLOW}📋 Testing CBOM Endpoints${NC}"
test_endpoint "List CBOM Reports" "/api/v1/cbom" "200"

echo -e "\n${YELLOW}🌐 Testing Cilium Integration${NC}"
test_endpoint "Cilium Flows" "/api/v1/cilium/flows" "200"
test_endpoint "Cilium Policies" "/api/v1/cilium/policies" "200"
test_endpoint "Cilium Metrics" "/api/v1/cilium/metrics" "200"

echo -e "\n${YELLOW}⚛️ Testing Quantum Integration${NC}"
if [ "$SERVER_EDITION" = "oss" ]; then
    skip_test "Quantum Attestations"
    skip_test "Quantum Networks"
else
    test_endpoint "Quantum Attestations" "/api/v1/quantum/attestations" "200"
    test_endpoint "Quantum Networks" "/api/v1/quantum/networks" "200"
fi

echo -e "\n${YELLOW}☸️ Testing Kubernetes Integration${NC}"
test_endpoint "Kubernetes Clusters" "/api/v1/kubernetes/clusters" "200"

echo -e "\n${YELLOW}🛡️ Testing Security Endpoints${NC}"
test_endpoint "Security Events" "/api/v1/security/events" "200"

echo -e "\n${YELLOW}📝 Testing Data Creation${NC}"
# Test CBOM creation
test_post_endpoint "Create CBOM Report" "/api/v1/cbom" '{"name":"Test CBOM","description":"Validation test"}'

# Test Security Event creation  
test_post_endpoint "Create Security Event" "/api/v1/security/events" '{"type":"vulnerability","severity":"medium","description":"Test event"}'

echo -e "\n${YELLOW}🧪 Performance Tests${NC}"
echo -n "Testing response time... "
if response_time=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/healthz" 2>/dev/null); then
    if (( $(echo "$response_time < 1.0" | bc -l) )); then
        echo -e "${GREEN}✅ PASS${NC} (${response_time}s)"
    else
        echo -e "${YELLOW}⚠️ SLOW${NC} (${response_time}s)"
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
else
    echo -e "${RED}❌ FAIL${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

echo -e "\n${BLUE}📈 Validation Results${NC}"
echo "======================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: $((TOTAL_TESTS - FAILED_TESTS)) ${GREEN}✅${NC}"
echo -e "Failed: $FAILED_TESTS ${RED}❌${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! CryptoBOM SaaS is working correctly.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️ Some tests failed. Please check the server logs.${NC}"
    exit 1
fi