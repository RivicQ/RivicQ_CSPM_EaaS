#!/bin/bash

# Quick Vulnerable Demo Setup - Creates realistic vulnerability scenarios
# Perfect for demonstrating CryptoBOM capabilities

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${BLUE}🚨 Setting up vulnerable CryptoBOM demo environment...${NC}"

# Check dependencies
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq is required for this demo${NC}"
    exit 1
fi

# Create vulnerable demo data
echo -e "${YELLOW}🔍 Creating vulnerable cryptographic scenarios...${NC}"

# Create vulnerable demo responses
mkdir -p demo-data

# Generate vulnerable assets
cat > demo-data/vulnerable-assets.json << 'EOF
{
  "scan_id": "vulnerable-scan-$(date +%s)",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "vulnerable_assets": [
    {
      "id": "vuln-001",
      "name": "Legacy RSA-1024 Certificate",
      "algorithm": "RSA-1024",
      "key_size": 1024,
      "location": "k8s-ingress-legacy",
      "severity": "CRITICAL",
      "quantum_vulnerable": true,
      "quantum_break_time": "~10 minutes",
      "recommendation": "Upgrade to RSA-4096 or migrate to post-quantum",
      "cve_id": "CVE-2024-Q001",
      "discovered_at": "2025-02-01T10:00:00Z"
    },
    {
      "id": "vuln-002",
      "name": "Weak ECDSA Key",
      "algorithm": "ECDSA-P256",
      "key_size": 256,
      "location": "api-gateway",
      "severity": "HIGH",
      "quantum_vulnerable": true,
      "quantum_break_time": "~30 minutes",
      "recommendation": "Upgrade to ECDSA-P521 or Dilithium",
      "cve_id": "CVE-2024-Q002",
      "discovered_at": "2025-02-01T10:01:00Z"
    },
    {
      "id": "vuln-003",
      "name": "Outdated TLS Protocol",
      "algorithm": "TLS-1.0",
      "protocol": "TLS-1.0",
      "location": "legacy-web-server",
      "severity": "HIGH",
      "quantum_vulnerable": true,
      "quantum_break_time": "Known vulnerabilities exist",
      "recommendation": "Upgrade to TLS 1.3 with quantum-safe ciphers",
      "cve_id": "CVE-2023-3817",
      "discovered_at": "2025-02-01T10:02:00Z"
    },
    {
      "id": "vuln-004",
      "name": "Weak DH Parameters",
      "algorithm": "Diffie-Hellman",
      "key_size": 1024,
      "location": "vpn-concentrator",
      "severity": "HIGH",
      "quantum_vulnerable": true,
      "quantum_break_time": "~1 hour",
      "recommendation": "Use 4096-bit DH or ECDH",
      "cve_id": "CVE-2024-Q003",
      "discovered_at": "2025-02-01T10:03:00Z"
    },
    {
      "id": "vuln-005",
      "name": "Quantum-Safe AES Encryption",
      "algorithm": "AES-256",
      "key_size": 256,
      "location": "database-encryption",
      "severity": "LOW",
      "quantum_vulnerable": false,
      "quantum_break_time": "Quantum-resistant",
      "recommendation": "Continue monitoring",
      "discovered_at": "2025-02-01T10:04:00Z"
    }
  ],
  "total_assets_scanned": 127,
  "vulnerable_count": 4,
  "compliance_score": 68.5,
  "risk_distribution": {
    "CRITICAL": 1,
    "HIGH": 3,
    "MEDIUM": 0,
    "LOW": 1
  }
}
EOF

# Generate quantum vulnerability assessment
cat > demo-data/quantum-assessment.json << 'EOF
{
  "assessment_id": "quantum-assessment-$(date +%s)",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "quantum_network": "IBM Quantum Falcon",
  "algorithm_safety": [
    {
      "algorithm": "RSA-1024",
      "safety_score": 5,
      "quantum_vulnerable": true,
      "break_time_estimate": "10 minutes with 4,000 qubits",
      "migration_options": ["Kyber-768", "RSA-4096 (interim)"]
    },
    {
      "algorithm": "ECDSA-P256", 
      "safety_score": 20,
      "quantum_vulnerable": true,
      "break_time_estimate": "30 minutes with 4,000 qubits",
      "migration_options": ["Dilithium-3", "Falcon-512", "ECDSA-P521 (interim)"]
    },
    {
      "algorithm": "AES-256",
      "safety_score": 95,
      "quantum_vulnerable": false,
      "break_time_estimate": "2^256 operations (infeasible)",
      "migration_options": []
    },
    {
      "algorithm": "Kyber-768",
      "safety_score": 90,
      "quantum_vulnerable": false,
      "break_time_estimate": "Quantum-resistant",
      "migration_options": []
    }
  ],
  "overall_quantum_readiness": 32.5,
  "critical_issues": 2,
  "recommendations": [
    "Immediately upgrade RSA-1024 certificates",
    "Plan migration from ECDSA-P256 to Dilithium",
    "Maintain AES-256 encryption (quantum-safe)",
    "Implement Kyber for new deployments"
  ]
}
EOF

# Create vulnerability alerts
cat > demo-data/vulnerability-alerts.json << 'EOF
{
  "alerts": [
    {
      "id": "alert-001",
      "type": "QUANTUM_VULNERABILITY",
      "severity": "CRITICAL",
      "title": "Critical Quantum Vulnerability Detected",
      "description": "RSA-1024 certificate found in production ingress",
      "affected_assets": ["k8s-ingress-legacy"],
      "action_required": "Immediate upgrade to quantum-safe algorithm",
      "deadline": "2025-02-08T00:00:00Z",
      "created_at": "2025-02-01T10:30:00Z"
    },
    {
      "id": "alert-002", 
      "type": "COMPLIANCE_BREACH",
      "severity": "HIGH",
      "title": "eIDAS 2.0 Compliance Risk",
      "description": "Multiple assets vulnerable to quantum attacks",
      "affected_assets": ["api-gateway", "vpn-concentrator", "legacy-web-server"],
      "action_required": "Implement quantum-safe algorithms",
      "deadline": "2025-03-01T00:00:00Z", 
      "created_at": "2025-02-01T10:35:00Z"
    }
  ]
}
EOF

echo -e "${GREEN}✅ Vulnerable demo data created!${NC}"

# Build and start server
echo -e "${YELLOW}🔨 Building CryptoBOM server...${NC}"
cd cryptobom-saas
go build -o bin/cryptobom-server cmd/server/main.go

echo -e "${YELLOW}🚀 Starting vulnerable demo server...${NC}"
./bin/cryptobom-server > demo-server.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Load vulnerable data into server
echo -e "${YELLOW}📊 Loading vulnerable scenarios into server...${NC}"

# Create vulnerable assets via API
curl -X POST http://localhost:8080/api/v1/assets/bulk \
  -H "Content-Type: application/json" \
  -d @demo-data/vulnerable-assets.json 2>/dev/null || true

# Trigger vulnerability assessment
curl -X POST http://localhost:8080/api/v1/quantum/assess \
  -H "Content-Type: application/json" \
  -d @demo-data/quantum-assessment.json 2>/dev/null || true

# Create vulnerability alerts
curl -X POST http://localhost:8080/api/v1/security/alerts \
  -H "Content-Type: application/json" \
  -d @demo-data/vulnerability-alerts.json 2>/dev/null || true

echo -e "${GREEN}✅ Vulnerable demo environment ready!${NC}"
echo ""
echo -e "${PURPLE}🎯 Demo Commands:${NC}"
echo ""
echo -e "${YELLOW}1. View vulnerable assets:${NC}"
echo "curl -s http://localhost:8080/api/v1/assets | jq '.'"
echo ""
echo -e "${YELLOW}2. Check quantum vulnerability assessment:${NC}"
echo "curl -s http://localhost:8080/api/v1/metrics/vulnerabilities | jq '.'"
echo ""
echo -e "${YELLOW}3. View security alerts:${NC}"
echo "curl -s http://localhost:8080/api/v1/security/events | jq '.'"
echo ""
echo -e "${YELLOW}4. Start live scan:${NC}"
echo "curl -X POST http://localhost:8080/api/v1/discovery/scan"
echo ""
echo -e "${YELLOW}5. Open vulnerable dashboard:${NC}"
echo "Open docs/archive/demo-fixtures in your browser (demo UI archived)"
echo ""
echo -e "${PURPLE}📱 Demo Scenarios to Show:${NC}"
echo ""
echo -e "${RED}🚨 CRITICAL:${NC} RSA-1024 certificate vulnerable to quantum attacks (breaks in 10 minutes)"
echo ""
echo -e "${YELLOW}⚠️  HIGH:${NC} ECDSA-P256 keys need quantum migration (30 minutes to break)"
echo ""
echo -e "${YELLOW}⚠️  HIGH:${NC} TLS 1.0 protocol with known vulnerabilities"
echo ""
echo -e "${GREEN}✅ LOW:${NC} AES-256 encryption is quantum-safe and recommended"
echo ""
echo -e "${PURPLE}💡 Key Talking Points:${NC}"
echo "• 70% of organizations don't know their crypto assets"
echo "• 65% of current algorithms are quantum-vulnerable" 
echo "• We found 4 critical vulnerabilities in 2 minutes"
echo "• CryptoBOM provides real-time quantum risk assessment"
echo "• Enterprise version includes IBM Quantum Network integration"
echo ""
echo -e "${GREEN}🎉 Vulnerable demo is running!${NC}"
echo -e "${BLUE}Server PID: $SERVER_PID${NC}"
echo -e "${BLUE}Dashboard: docs/archive/demo-fixtures (archived)${NC}"
echo -e "${BLUE}Server logs: demo-server.log${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the demo server${NC}"

# Trap for cleanup
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping vulnerable demo server...${NC}"
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    rm -rf demo-data
    echo -e "${GREEN}✅ Demo stopped and cleaned up${NC}"
}

trap cleanup INT TERM

# Wait for interrupt
wait $SERVER_PID 2>/dev/null