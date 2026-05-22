#!/bin/bash

# CryptoBOM SaaS - Edition-aware Quick Start Script

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
EDITION="${1:-oss}"
ACTION="${2:-start}"

# Find CryptoBOM directory
find_cryptobom() {
    if [ -f "go.mod" ] && grep -q "cryptobom-saas" go.mod; then
        pwd
    elif [ -d "$HOME/cryptobom-saas" ]; then
        echo "$HOME/cryptobom-saas"
    else
        find $HOME -name "cryptobom-saas" -type d 2>/dev/null | head -1
    fi
}

CRYPTOBOM=$(find_cryptobom)

# Function to check if server is running
check_server() {
    local port=$1
    if curl -s "http://localhost:$port/healthz" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to get server info
get_server_info() {
    local port=$1
    if curl -s "http://localhost:$port/healthz" >/dev/null 2>&1; then
        curl -s "http://localhost:$port/healthz" | grep -o '"edition":"[^"]*"' | cut -d'"' -f4
    fi
}

# Function to start OSS server
start_oss() {
    echo -e "${YELLOW}🔨 Building CryptoBOM OSS...${NC}"
    cd "$CRYPTOBOM"
    
    # Use build system
    ./build.sh oss latest
    
    echo -e "${YELLOW}🚀 Starting CryptoBOM OSS server...${NC}"
    nohup ./bin/cryptobom-oss > server-oss.log 2>&1 &
    
    echo -e "${YELLOW}⏳ Waiting for OSS server to start...${NC}"
    for i in {1..10}; do
        if check_server 8080; then
            echo -e "${GREEN}✅ OSS Server is running!${NC}"
            break
        fi
        sleep 1
    done
    
    if ! check_server 8080; then
        echo -e "${RED}❌ Failed to start OSS server!${NC}"
        echo -e "${YELLOW}Check logs: $CRYPTOBOM/server-oss.log${NC}"
        exit 1
    fi
}

# Function to start Enterprise server
start_enterprise() {
    echo -e "${YELLOW}🔨 Building CryptoBOM Enterprise...${NC}"
    cd "$CRYPTOBOM"
    
    # Use build system
    ./build.sh enterprise latest
    
    echo -e "${YELLOW}🚀 Starting CryptoBOM Enterprise server...${NC}"
    nohup ./bin/cryptobom-enterprise > server-enterprise.log 2>&1 &
    
    echo -e "${YELLOW}⏳ Waiting for Enterprise server to start...${NC}"
    for i in {1..10}; do
        if check_server 9090; then
            echo -e "${GREEN}✅ Enterprise Server is running!${NC}"
            break
        fi
        sleep 1
    done
    
    if ! check_server 9090; then
        echo -e "${RED}❌ Failed to start Enterprise server!${NC}"
        echo -e "${YELLOW}Check logs: $CRYPTOBOM/server-enterprise.log${NC}"
        exit 1
    fi
}

# Function to open dashboard
open_dashboard() {
    local edition=$1
    local port=$2
    
    echo -e "${YELLOW}🌐 Opening ${edition^} dashboard...${NC}"
    
    # Try different browsers
    if command -v xdg-open >/dev/null; then
        xdg-open "http://localhost:${port}"
    elif command -v open >/dev/null; then
        open "http://localhost:${port}"
    elif command -v google-chrome >/dev/null; then
        google-chrome "http://localhost:${port}"
    elif command -v firefox >/dev/null; then
        firefox "http://localhost:${port}"
    else
        echo -e "${YELLOW}📁 Please open manually: http://localhost:${port}${NC}"
    fi
}

# Function to stop servers
stop_servers() {
    echo -e "${YELLOW}🛑 Stopping CryptoBOM servers...${NC}"
    pkill -f cryptobom-oss 2>/dev/null || true
    pkill -f cryptobom-enterprise 2>/dev/null || true
    sleep 2
    echo -e "${GREEN}✅ Servers stopped${NC}"
}

# Function to show status
show_status() {
    echo -e "${BLUE}📊 CryptoBOM Server Status:${NC}"
    echo ""
    
    if check_server 8080; then
        edition=$(curl -s http://localhost:8080/healthz | grep -o '"edition":"[^"]*"' | cut -d'"' -f4)
        echo -e "${GREEN}✅ OSS Server running on port 8080${NC}"
        echo -e "${BLUE}   Edition: $edition${NC}"
        echo -e "${BLUE}   URL: http://localhost:8080${NC}"
    else
        echo -e "${RED}❌ OSS Server not running${NC}"
    fi
    
    if check_server 9090; then
        edition=$(curl -s http://localhost:9090/healthz | grep -o '"edition":"[^"]*"' | cut -d'"' -f4)
        ibmq_status=$(curl -s http://localhost:9090/healthz | grep -o '"ibmq_connected":[^,}]*' | cut -d':' -f2)
        echo -e "${GREEN}✅ Enterprise Server running on port 9090${NC}"
        echo -e "${BLUE}   Edition: $edition${NC}"
        echo -e "${BLUE}   IBMQ Connected: $ibmq_status${NC}"
        echo -e "${BLUE}   URL: http://localhost:9090${NC}"
    else
        echo -e "${RED}❌ Enterprise Server not running${NC}"
    fi
}

# Function to test endpoints
test_endpoints() {
    echo -e "${BLUE}🧪 Testing CryptoBOM Endpoints:${NC}"
    echo ""
    
    # Test OSS endpoints
    if check_server 8080; then
        echo -e "${GREEN}🔍 Testing OSS endpoints:${NC}"
        echo -e "${YELLOW}   Health:${NC}"
        curl -s http://localhost:8080/healthz | grep -o '"service":"[^"]*"' | cut -d'"' -f4
        echo -e "${YELLOW}   Metrics:${NC}"
        curl -s http://localhost:8080/api/v1/metrics/overview >/dev/null && echo "✅ OK" || echo "❌ Failed"
    fi
    
    # Test Enterprise endpoints
    if check_server 9090; then
        echo -e "${GREEN}🔍 Testing Enterprise endpoints:${NC}"
        echo -e "${YELLOW}   Health:${NC}"
        curl -s http://localhost:9090/healthz | grep -o '"service":"[^"]*"' | cut -d'"' -f4
        echo -e "${YELLOW}   IBMQ Status:${NC}"
        curl -s http://localhost:9090/api/v1/ibmq/status >/dev/null && echo "✅ OK" || echo "❌ Failed"
    fi
}

# Function to show logs
show_logs() {
    echo -e "${BLUE}📋 Server Logs:${NC}"
    echo ""
    
    if [ -f "$CRYPTOBOM/server-oss.log" ]; then
        echo -e "${GREEN}📄 OSS Server Logs:${NC}"
        tail -10 "$CRYPTOBOM/server-oss.log"
        echo ""
    fi
    
    if [ -f "$CRYPTOBOM/server-enterprise.log" ]; then
        echo -e "${GREEN}📄 Enterprise Server Logs:${NC}"
        tail -10 "$CRYPTOBOM/server-enterprise.log"
        echo ""
    fi
}

# Main commands
case "$EDITION" in
    "oss"|"open-source"|"opensource")
        case "$ACTION" in
            "start")
                if check_server 8080; then
                    echo -e "${GREEN}✅ OSS Server is already running!${NC}"
                else
                    start_oss
                fi
                open_dashboard "oss" 8080
                ;;
            "stop")
                pkill -f cryptobom-oss || true
                echo -e "${GREEN}✅ OSS Server stopped${NC}"
                ;;
            "restart")
                pkill -f cryptobom-oss 2>/dev/null || true
                sleep 2
                start_oss
                ;;
            *)
                echo -e "${RED}❌ Unknown action: $ACTION${NC}"
                echo -e "${YELLOW}Available: start, stop, restart${NC}"
                exit 1
                ;;
        esac
        ;;
        
    "enterprise"|"ent"|"pro")
        case "$ACTION" in
            "start")
                if check_server 9090; then
                    echo -e "${GREEN}✅ Enterprise Server is already running!${NC}"
                else
                    start_enterprise
                fi
                open_dashboard "enterprise" 9090
                ;;
            "stop")
                pkill -f cryptobom-enterprise || true
                echo -e "${GREEN}✅ Enterprise Server stopped${NC}"
                ;;
            "restart")
                pkill -f cryptobom-enterprise 2>/dev/null || true
                sleep 2
                start_enterprise
                ;;
            *)
                echo -e "${RED}❌ Unknown action: $ACTION${NC}"
                echo -e "${YELLOW}Available: start, stop, restart${NC}"
                exit 1
                ;;
        esac
        ;;
        
    "status")
        show_status
        ;;
        
    "stop")
        stop_servers
        ;;
        
    "test")
        test_endpoints
        ;;
        
    "logs")
        show_logs
        ;;
        
    "help"|"-h"|"--help")
        echo -e "${BLUE}CryptoBOM SaaS - Dual Edition Commands:${NC}"
        echo ""
        echo -e "${GREEN}Usage: ./run-edition.sh [edition] [action]${NC}"
        echo ""
        echo -e "${YELLOW}Editions:${NC}"
        echo -e "  oss        - Open Source edition (port 8080)"
        echo -e "  enterprise - Enterprise edition with IBMQ (port 9090)"
        echo ""
        echo -e "${YELLOW}Actions:${NC}"
        echo -e "  start      - Start server and open dashboard (default)"
        echo -e "  stop       - Stop server"
        echo -e "  restart    - Restart server"
        echo -e ""
        echo -e "${YELLOW}Global Commands:${NC}"
        echo -e "  status     - Show status of all servers"
        echo -e "  stop       - Stop all servers"
        echo -e "  test       - Test API endpoints"
        echo -e "  logs       - Show server logs"
        echo -e "  help       - Show this help"
        echo ""
        echo -e "${BLUE}Examples:${NC}"
        echo -e "  ./run-edition.sh oss start"
        echo -e "  ./run-edition.sh enterprise start"
        echo -e "  ./run-edition.sh status"
        echo -e "  ./run-edition.sh stop"
        echo ""
        echo -e "${BLUE}🌐 URLs:${NC}"
        echo -e "  OSS Dashboard:        http://localhost:8080"
        echo -e "  Enterprise Dashboard: http://localhost:9090"
        echo -e "  OSS API:             http://localhost:8080/api/v1"
        echo -e "  Enterprise API:      http://localhost:9090/api/v1"
        echo -e "  IBMQ Integration:    http://localhost:9090/api/v1/ibmq"
        ;;
        
    *)
        echo -e "${RED}❌ Unknown edition: $EDITION${NC}"
        echo -e "${YELLOW}Use './run-edition.sh help' for usage information${NC}"
        exit 1
        ;;
esac

# Show summary after successful start
if [[ "$ACTION" == "start" ]]; then
    echo ""
    echo -e "${GREEN}🎉 CryptoBOM ${EDITION^} Edition is ready!${NC}"
    echo ""
    
    if [[ "$EDITION" == "oss" ]]; then
        echo -e "${BLUE}📊 OSS Server:    http://localhost:8080${NC}"
        echo -e "${BLUE}📱 Dashboard:     http://localhost:8080${NC}"
        echo -e "${BLUE}🔗 API Base:     http://localhost:8080/api/v1${NC}"
        echo ""
        echo -e "${YELLOW}🔓 OSS Features:${NC}"
        echo -e "  • eBPF cryptographic asset discovery"
        echo -e "  • Basic CBOM management"
        echo -e "  • Vulnerability detection"
        echo -e "  • Kubernetes integration"
    else
        echo -e "${BLUE}📊 Enterprise Server: http://localhost:9090${NC}"
        echo -e "${BLUE}📱 Dashboard:         http://localhost:9090${NC}"
        echo -e "${BLUE}🔗 API Base:          http://localhost:9090/api/v1${NC}"
        echo -e "${BLUE}⚛️  IBMQ Integration:  http://localhost:9090/api/v1/ibmq${NC}"
        echo ""
        echo -e "${YELLOW}🔒 Enterprise Features:${NC}"
        echo -e "  • IBM Quantum attestation & verification"
        echo -e "  • Advanced threat detection with ML"
        echo -e "  • Multi-cloud deployment support"
        echo -e "  • Enterprise SSO (SAML/LDAP)"
        echo -e "  • Advanced analytics & reporting"
    fi
fi