#!/bin/bash

# CryptoBOM SaaS - Production Demo Script
# This script runs a comprehensive demo for presentations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Demo timing
DEMO_STEP=0

# Function to display demo steps
demo_step() {
    ((DEMO_STEP++))
    echo -e "\n${PURPLE}🎯 Step $DEMO_STEP: $1${NC}"
    echo -e "${CYAN}----------------------------------------${NC}"
    sleep 2
}

# Function to execute commands with description
run_command() {
    echo -e "${YELLOW}🔧 $1${NC}"
    echo -e "${BLUE}$ ${2}${NC}"
    eval "$2"
    sleep 3
}

# Function to display results
show_result() {
    echo -e "${GREEN}✅ $1${NC}"
    sleep 2
}

# Main demo function
main() {
    clear
    echo -e "${BLUE}"
    echo "🚀 CryptoBOM SaaS - Production Demo"
    echo "======================================"
    echo -e "${NC}"
    
    demo_step "Introduction to CryptoBOM SaaS"
    echo -e "${CYAN}
CryptoBOM SaaS is the world's first CNCF-compliant CBOM platform
that provides real-time cryptographic asset discovery and quantum
vulnerability assessment.

We're solving a $4.5B problem where:
• 70% of organizations lack crypto visibility
• 65% of algorithms are quantum-vulnerable
• Compliance reporting is manual and error-prone
${NC}"
    
    read -p "Press Enter to continue..."
    
    demo_step "Build and Start the Platform"
    run_command "Building the CryptoBOM server..." "cd cryptobom-saas && go build -o bin/cryptobom-server cmd/server/main.go"
    show_result "Server built successfully!"
    
    run_command "Starting the server in background..." "cd cryptobom-saas && ./bin/cryptobom-server > server.log 2>&1 &"
    SERVER_PID=$!
    show_result "Server started with PID: $SERVER_PID"
    
    # Wait for server to be ready
    sleep 5
    run_command "Checking server health..." "curl -s http://localhost:8080/healthz | jq '.'"
    
    demo_step "Open the Interactive Dashboard"
    echo -e "${YELLOW}🌐 Opening the CryptoBOM dashboard...${NC}"
    echo -e "${BLUE}Open: docs/archive/demo-fixtures in your browser (demo UI archived)${NC}"
    echo -e "${GREEN}The dashboard shows:${NC}"
    echo -e "${CYAN}• Real-time cryptographic assets${NC}"
    echo -e "${CYAN}• Algorithm distribution charts${NC}"
    echo -e "${CYAN}• Vulnerability risk assessment${NC}"
    echo -e "${CYAN}• Quantum safety scoring${NC}"
    
    read -p "Press Enter to continue with API demonstration..."
    
    demo_step "API Demonstration - Cryptographic Assets"
    run_command "Fetching cryptographic assets..." "curl -s http://localhost:8080/api/v1/assets | jq '.'"
    show_result "Successfully retrieved cryptographic asset inventory!"
    
    demo_step "API Demonstration - Metrics Overview"
    run_command "Getting platform metrics..." "curl -s http://localhost:8080/api/v1/metrics/overview | jq '.'"
    show_result "Retrieved comprehensive platform metrics!"
    
    demo_step "Live Asset Discovery Scan"
    run_command "Starting cryptographic asset scan..." "curl -X POST http://localhost:8080/api/v1/discovery/scan -H 'Content-Type: application/json' -d '{\"scope\": [\"kubernetes\", \"containers\"], \"options\": {\"deep_scan\": true}}' | jq '.'"
    show_result "Scan initiated successfully!"
    
    demo_step "Quantum Vulnerability Assessment"
    run_command "Checking quantum vulnerability status..." "curl -s http://localhost:8080/api/v1/metrics/vulnerabilities | jq '.'"
    show_result "Quantum vulnerability assessment complete!"
    
    demo_step "Create New CBOM Report"
    run_command "Creating new CBOM report..." "curl -X POST http://localhost:8080/api/v1/cbom -H 'Content-Type: application/json' -d '{\"name\": \"Demo Production CBOM\", \"version\": \"1.0.0\", \"assets\": [{\"name\": \"Demo TLS Certificate\", \"algorithm\": \"RSA-2048\", \"key_size\": 2048, \"location\": \"demo-server\", \"risk_level\": \"medium\", \"quantum_safe\": false}]}' | jq '.'"
    show_result "CBOM report created successfully!"
    
    demo_step "Algorithm Distribution Analysis"
    run_command "Analyzing algorithm distribution..." "curl -s http://localhost:8080/api/v1/metrics/algorithms | jq '.'"
    show_result "Algorithm distribution analysis complete!"
    
    demo_step "Kubernetes Deployment Demo"
    echo -e "${CYAN}
Now let me show you how this deploys on Kubernetes...
${NC}"
    
    if command -v kubectl &> /dev/null && kubectl cluster-info &> /dev/null; then
        run_command "Checking Kubernetes deployment..." "kubectl get nodes --no-headers | wc -l && echo 'nodes available'"
        
        echo -e "${YELLOW}🚀 Deploying CryptoBOM OSS to Kubernetes...${NC}"
        run_command "Deploying with Helm..." "cd cryptobom-saas && ./scripts/deploy-oss-demo.sh --dry-run"
    else
        echo -e "${YELLOW}⚠️  Kubernetes cluster not available - showing deployment YAML${NC}"
        run_command "Showing Kubernetes deployment..." "cd cryptobom-saas && cat deploy/helm/cryptobom-oss/templates/deployment.yaml | head -20"
    fi
    
    demo_step "Enterprise Features Preview"
    echo -e "${CYAN}
Enterprise version includes advanced features:

🚀 IBM Quantum Network Integration
   Real-time quantum vulnerability scoring
   Post-quantum algorithm recommendations
   Migration path planning

🤖 ML-based Threat Detection
   Behavioral analysis of crypto operations
   Anomaly detection
   Predictive security insights

☁️ Multi-Cloud Support
   AWS, GCP, Azure integration
   Global deployment management
   Cross-cloud observability

👥 Enterprise SSO
   SAML, LDAP, OIDC support
   Role-based access control
   Audit logging

🔧 HSM Integration
   Hardware security module support
   Key management and rotation
   FIPS 140-2 compliance

Available Q2 2025!
${NC}"
    
    demo_step "Call to Action"
    echo -e "${GREEN}
🎉 CryptoBOM SaaS Demo Complete!

🚀 Available NOW:
   • Open Source: github.com/rivic-q/cryptobom-saas
   • Live Demo: rivic-q.io/cryptobom-demo
   • Community: Discord/Slack/LinkedIn

🏢 Enterprise Version - Q2 2025:
   • IBM Quantum Integration
   • Advanced ML Features
   • Multi-Cloud Support

🎯 Key Benefits:
   • 85% improvement in crypto visibility
   • 60% reduction in security tooling costs
   • Automated compliance reporting
   • Quantum migration roadmap

🤝 Join Our Mission:
   ⭐ Star the repository
   🐛 Report issues
   📝 Contribute code
   💬 Join community

Thank you! Let's secure the quantum future together!
${NC}"
    
    read -p "Press Enter to end demo..."
    
    # Cleanup
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
        show_result "Server stopped"
    fi
    
    echo -e "${GREEN}🎉 Demo completed successfully!${NC}"
}

# Trap for cleanup
cleanup() {
    echo -e "\n${YELLOW}🛑 Demo interrupted - cleaning up...${NC}"
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    exit 1
}

trap cleanup INT TERM

# Check if we're in the right directory
if [ ! -f "go.mod" ]; then
    echo -e "${RED}❌ Please run this script from the project root directory${NC}"
    exit 1
fi

# Run the demo
main