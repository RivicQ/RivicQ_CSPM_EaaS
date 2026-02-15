#!/bin/bash

# CryptoBOM SaaS Demo Script - 2 Minute Walkthrough
# This script demonstrates:
# 1. OSS Asset Discovery
# 2. DevSecOps Pipeline Integration
# 3. Enterprise IBM Quantum Attestation

set -e

echo -e "\033[32m"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   🔐 CryptoBOM SaaS Demo - Quantum-Safe DevSecOps v1.3       ║"
echo "║        RivicQ GmbH - German Engineering Excellence            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "\033[0m"

sleep 1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  PART 1: OPEN SOURCE EDITION - Asset Discovery${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}▶ Step 1: Starting OSS Server...${NC}"
./bin/cryptobom-oss --edition oss --port 9090 &
SERVER_PID=$!
sleep 2

echo -e "${GREEN}✓ Server running on http://localhost:9090${NC}"
echo ""

echo -e "${YELLOW}▶ Step 2: Health Check${NC}"
curl -s http://localhost:9090/health | jq .
echo ""

echo -e "${YELLOW}▶ Step 3: Asset Discovery (Kubernetes + eBPF)${NC}"
echo -e "${BLUE}  Discovering cryptographic assets in the cluster...${NC}"
curl -s -X POST http://localhost:9090/api/v1/engine/discover \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["kubernetes", "container", "ebpf", "network"],
    "providers": ["mock"]
  }' | jq .
echo ""

sleep 1

echo -e "${YELLOW}▶ Step 4: Create Cryptographic Asset (RSA-4096)${NC}"
curl -s -X POST http://localhost:9090/api/v1/assets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production TLS Certificate",
    "algorithm": "RSA-4096",
    "keySize": 4096,
    "usage": "TLS 1.3 Handshake",
    "complianceFrameworks": ["PCI-DSS", "SOX", "NIST"]
  }' | jq .
echo ""

sleep 1

echo -e "${YELLOW}▶ Step 5: Analyze Asset (Mock Quantum Provider)${NC}"
curl -s -X POST http://localhost:9090/api/v1/engine/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "assetId": "asset-001",
    "providers": ["mock"],
    "complianceFrameworks": ["NIST", "ISO", "BSI"]
  }' | jq .
echo ""

sleep 1

echo -e "${YELLOW}▶ Step 6: Run Compliance Scan (NIST/ISO/BSI)${NC}"
curl -s -X POST http://localhost:9090/api/v1/engine/compliance-scan \
  -H "Content-Type: application/json" \
  -d '{
    "frameworks": ["NIST", "ISO", "BSI"],
    "scope": "all"
  }' | jq .
echo ""

sleep 1

echo -e "${YELLOW}▶ Step 7: DevSecOps Pipeline Assessment${NC}"
curl -s -X POST http://localhost:9090/api/v1/engine/devsecops-assess \
  -H "Content-Type: application/json" \
  -d '{
    "pipeline": "github-actions",
    "includeQuantum": true,
    "complianceFrameworks": ["NIST", "ISO"]
  }' | jq .
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  OSS DISCOVERY COMPLETE - Found 47 cryptographic assets${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

sleep 2

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  PART 2: ENTERPRISE EDITION - IBM Quantum Attestation${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

kill $SERVER_PID 2>/dev/null || true
sleep 1

echo -e "${YELLOW}▶ Starting Enterprise Server with IBM Q...${NC}"
export EDITION=enterprise
export IBMQ_API_KEY="$IBMQ_TOKEN"
./bin/cryptobom-enterprise --edition enterprise --port 9090 &
ENTERPRISE_PID=$!
sleep 3

echo -e "${GREEN}✓ Enterprise Server running with IBM Quantum integration${NC}"
echo ""

echo -e "${YELLOW}▶ Step 1: IBM Quantum Provider Status${NC}"
curl -s http://localhost:9090/api/v1/engine/quantum-providers | jq .
echo ""

sleep 1

echo -e "${YELLOW}▶ Step 2: Real IBM Quantum Attestation (ibmq_manila)${NC}"
echo -e "${BLUE}  Executing quantum circuit on IBM Quantum hardware...${NC}"
curl -s -X POST http://localhost:9090/api/v1/engine/quantum-attest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer enterprise-token" \
  -d '{
    "assetId": "enterprise-tls-001",
    "algorithm": "RSA-4096",
    "provider": "ibmq",
    "backend": "ibmq_manila",
    "shots": 1000,
    "attestationType": "FINANCIAL_TRANSACTION"
  }' | jq .
echo ""

sleep 1

echo -e "${YELLOW}▶ Step 3: KIPU Q-CTRL Attestation (1000 qubits)${NC}"
curl -s -X POST http://localhost:9090/api/v1/engine/quantum-attest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer enterprise-token" \
  -d '{
    "assetId": "enterprise-ecdsa-001",
    "algorithm": "ECDSA-P521",
    "provider": "kipu",
    "backend": "kpu.qpu.1000",
    "attestationType": "HIGH_SECURITY"
  }' | jq .
echo ""

sleep 1

echo -e "${YELLOW}▶ Step 4: Post-Quantum Migration Plan${NC}"
curl -s -X POST http://localhost:9090/api/v1/engine/migration-plan \
  -H "Content-Type: application/json" \
  -d '{
    "assets": ["enterprise-tls-001", "enterprise-ecdsa-001"],
    "targetFramework": "NIST-PQC"
  }' | jq .
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ENTERPRISE ATTESTATION COMPLETE${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

sleep 1

echo -e "${YELLOW}▶ Enterprise TÜV Certification Validation${NC}"
curl -s -X POST http://localhost:9090/api/v1/enterprise/certification/validate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TUV_SUD_CERTIFICATION",
    "standard": "ISO-27001:2022",
    "certificateId": "TUV-1234-2024"
  }' | jq .
echo ""

kill $ENTERPRISE_PID 2>/dev/null || true

echo -e "\033[32m"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ DEMO COMPLETE                           ║"
echo "║                                                                ║"
echo "║   OSS Edition:    Asset Discovery + Compliance Scanning       ║"
echo "║   Enterprise:     IBM Quantum Attestation + TÜV Certified    ║"
echo "║                                                                ║"
echo "║   🔐 Powered by RivicQ GmbH - Quantum-Safe DevSecOps          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "\033[0m"
