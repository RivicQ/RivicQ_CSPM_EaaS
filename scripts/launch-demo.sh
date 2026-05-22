#!/bin/bash

# Quick Demo Launcher for LinkedIn Demo
# This script launches a working demo of CryptoBOM OSS

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 CryptoBOM OSS - LinkedIn Demo Launcher${NC}"
echo -e "${BLUE}=============================================${NC}"

# Create a simple demo environment
echo -e "${YELLOW}📦 Setting up demo environment...${NC}"

# Check if we're in the right directory
if [ ! -f "go.mod" ]; then
    echo -e "${YELLOW}❌ Please run this script from the cryptobom-saas directory${NC}"
    exit 1
fi

# Build the demo binary
echo -e "${YELLOW}🔨 Building CryptoBOM server...${NC}"
go build -o bin/cryptobom-server cmd/server/main.go

# Create demo config
cat > demo-config.yaml << EOF
database:
  url: "sqlite:///tmp/cryptobom-demo.db"
  
server:
  port: 8080
  
demo:
  enabled: true
  autoData: true
  
logging:
  level: "info"
EOF

echo -e "${GREEN}✅ Demo environment ready!${NC}"
echo ""
echo -e "${BLUE}🎯 LinkedIn Demo Instructions:${NC}"
echo ""
echo -e "${YELLOW}1. Start the server:${NC}"
echo "   ./bin/cryptobom-server"
echo ""
echo -e "${YELLOW}2. Open demo dashboard:${NC}"
echo "   Open docs/archive/demo-fixtures in your browser (demo UI archived)"
echo ""
echo -e "${YELLOW}3. Try API endpoints:${NC}"
echo "   curl http://localhost:8080/healthz"
echo "   curl http://localhost:8080/api/v1/metrics/overview"
echo "   curl http://localhost:8080/api/v1/assets"
echo ""
echo -e "${YELLOW}4. Key features to demonstrate:${NC}"
echo "   • Real-time CBOM monitoring"
echo "   • Cryptographic asset discovery"
echo "   • Vulnerability assessment"
echo "   • Quantum-safe algorithm tracking"
echo "   • CNCF-compliant deployment"
echo ""
echo -e "${GREEN}🎉 Demo ready for LinkedIn presentation!${NC}"
echo ""
echo -e "${BLUE}📱 For the demo:${NC}"
echo "   1. Start the server in one terminal"
echo "   2. Open the dashboard in browser"
echo "   3. Show live API calls"
echo "   4. Demonstrate real-time scanning"
echo ""

# Offer to start the server
read -p "Start the demo server now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🚀 Starting CryptoBOM server...${NC}"
    echo -e "${GREEN}Server running at: http://localhost:8080${NC}"
    echo -e "${GREEN}Dashboard: docs/archive/demo-fixtures (archived)${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""
    ./bin/cryptobom-server
fi