#!/bin/bash

# CryptoBOM SaaS Dual Edition Build System
# Supports both OSS and Enterprise editions

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Build configuration
EDITION="${1:-oss}"
VERSION="${2:-latest}"
OUTPUT_DIR="bin"

# Function to show usage
show_usage() {
    echo -e "${BLUE}CryptoBOM SaaS Build System${NC}"
    echo -e "${BLUE}========================${NC}"
    echo ""
    echo "Usage: ./build.sh [edition] [version]"
    echo ""
    echo "Editions:"
    echo "  oss        - Build Open Source edition (default)"
    echo "  enterprise - Build Enterprise edition with IBMQ integration"
    echo "  core       - Build unified core binary (edition auto-detected at runtime)"
    echo ""
    echo "Examples:"
    echo "  ./build.sh"
    echo "  ./build.sh oss"
    echo "  ./build.sh enterprise"
    echo "  ./build.sh enterprise v2.0.0"
    echo "  ./build.sh core          # unified binary, detect OSS/Enterprise at runtime"
    echo ""
}

# Function to build OSS edition
build_oss() {
    echo -e "${YELLOW}🔨 Building CryptoBOM OSS Edition v${VERSION}${NC}"
    
    # Create output directory
    mkdir -p $OUTPUT_DIR
    
    # Build OSS binary
    echo -e "${YELLOW}📦 Building OSS server...${NC}"
    go build \
        -ldflags "-X main.version=${VERSION} -X main.edition=oss" \
        -o $OUTPUT_DIR/cryptobom-oss \
        ./cmd/server/oss/main.go
    
    echo -e "${GREEN}✅ OSS binary built: $OUTPUT_DIR/cryptobom-oss${NC}"
    
    # Create OSS deployment files
    echo -e "${YELLOW}📄 Creating OSS deployment files...${NC}"
    cat > deploy/oss/docker/Dockerfile.oss << 'EOF'
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY bin/cryptobom-oss /app/cryptobom-server

EXPOSE 8080

CMD ["./cryptobom-server"]
EOF

    cat > deploy/oss/k8s/namespace-oss.yaml << 'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: cryptobom-oss
  labels:
    name: cryptobom-oss
    edition: oss
EOF

    cat > deploy/oss/k8s/deployment-oss.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cryptobom-oss
  namespace: cryptobom-oss
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cryptobom-oss
  template:
    metadata:
      labels:
        app: cryptobom-oss
        edition: oss
    spec:
      containers:
      - name: cryptobom-oss
        image: rivic-q/cryptobom-oss:latest
        ports:
        - containerPort: 8080
        env:
        - name: CRYPTOBOM_EDITION
          value: "oss"
        - name: CRYPTOBOM_LOG_LEVEL
          value: "info"
---
apiVersion: v1
kind: Service
metadata:
  name: cryptobom-oss-service
  namespace: cryptobom-oss
spec:
  selector:
    app: cryptobom-oss
  ports:
  - port: 8080
    targetPort: 8080
  type: ClusterIP
EOF

    echo -e "${GREEN}✅ OSS deployment files created${NC}"
}

# Function to build Enterprise edition
build_enterprise() {
    echo -e "${YELLOW}🔨 Building CryptoBOM Enterprise Edition v${VERSION}${NC}"
    
    # Create output directory
    mkdir -p $OUTPUT_DIR
    
    # Build Enterprise binary
    echo -e "${YELLOW}📦 Building Enterprise server with IBMQ...${NC}"
    go build \
        -ldflags "-X main.version=${VERSION} -X main.edition=enterprise" \
        -tags enterprise \
        -o $OUTPUT_DIR/cryptobom-enterprise \
        ./cmd/server/enterprise/main.go
    
    echo -e "${GREEN}✅ Enterprise binary built: $OUTPUT_DIR/cryptobom-enterprise${NC}"
    
    # Create Enterprise deployment files
    echo -e "${YELLOW}📄 Creating Enterprise deployment files...${NC}"
    cat > deploy/enterprise/docker/Dockerfile.enterprise << 'EOF'
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata curl

WORKDIR /app

COPY bin/cryptobom-enterprise /app/cryptobom-enterprise
COPY configs/enterprise.yaml /app/config.yaml

EXPOSE 9090

CMD ["./cryptobom-enterprise"]
EOF

    cat > deploy/enterprise/k8s/namespace-enterprise.yaml << 'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: cryptobom-enterprise
  labels:
    name: cryptobom-enterprise
    edition: enterprise
    ibmq-enabled: "true"
EOF

    cat > deploy/enterprise/k8s/deployment-enterprise.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cryptobom-enterprise
  namespace: cryptobom-enterprise
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cryptobom-enterprise
  template:
    metadata:
      labels:
        app: cryptobom-enterprise
        edition: enterprise
    spec:
      containers:
      - name: cryptobom-enterprise
        image: rivic-q/cryptobom-enterprise:latest
        ports:
        - containerPort: 9090
        env:
        - name: CRYPTOBOM_EDITION
          value: "enterprise"
        - name: IBMQ_ENABLED
          value: "true"
        - name: IBMQ_API_KEY
          valueFrom:
            secretKeyRef:
              name: ibmq-secrets
              key: api-key
        - name: CRYPTOBOM_LOG_LEVEL
          value: "info"
        - name: ML_ENABLED
          value: "true"
        - name: ANALYTICS_ENABLED
          value: "true"
        resources:
          limits:
            cpu: "1000m"
            memory: "2Gi"
          requests:
            cpu: "500m"
            memory: "1Gi"
---
apiVersion: v1
kind: Service
metadata:
  name: cryptobom-enterprise-service
  namespace: cryptobom-enterprise
spec:
  selector:
    app: cryptobom-enterprise
  ports:
  - port: 9090
    targetPort: 9090
  type: LoadBalancer
EOF

    cat > deploy/enterprise/k8s/ibmq-secret.yaml << 'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: ibmq-secrets
  namespace: cryptobom-enterprise
type: Opaque
data:
  # Base64 encoded IBM Quantum API key (replace with actual key)
  api-key: eW91ci1pYm0tcXVhbnR1bS1hcGkta2V5LWhlcmU=
  network: aWJtLXE=
  endpoint: aHR0cHM6Ly9xdWFudHVtLWNvbXB1dGluZy5pYm0uY29tL2FwaQ==
EOF

    echo -e "${GREEN}✅ Enterprise deployment files created${NC}"
}

# Function to build unified core edition (auto-detects OSS/Enterprise at runtime)
build_core() {
    echo -e "${YELLOW}🔨 Building CryptoBOM Core Edition v${VERSION}${NC}"

    # Create output directory
    mkdir -p $OUTPUT_DIR

    # Build unified binary
    echo -e "${YELLOW}📦 Building unified core server...${NC}"
    go build \
        -ldflags "-X main.version=${VERSION} -X main.edition=core" \
        -o $OUTPUT_DIR/cryptobom-core \
        ./cmd/server/

    echo -e "${GREEN}✅ Core binary built: $OUTPUT_DIR/cryptobom-core${NC}"

    # Create core deployment Dockerfile
    cat > deploy/core/docker/Dockerfile.core << 'EOF'
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY bin/cryptobom-core /app/cryptobom-server

EXPOSE 8080
EXPOSE 9090

# Edition is auto-detected at runtime via CRYPTOBOM_LICENSE_KEY env var
# OSS: no key needed (runs on :8080)
# Enterprise: set CRYPTOBOM_LICENSE_KEY=ENT-... (runs on :9090)
CMD ["./cryptobom-server"]
EOF

    echo -e "${GREEN}✅ Core deployment Dockerfile created${NC}"
}

# Function to create version info
create_version_info() {
    echo -e "${YELLOW}📝 Creating version info...${NC}"
    
    cat > VERSION << EOF
CryptoBOM SaaS
Edition: $EDITION
Version: $VERSION
Build Time: $(date)
Git Commit: $(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
Go Version: $(go version)
EOF

    echo -e "${GREEN}✅ Version info created${NC}"
}

# Function to show build summary
show_summary() {
    echo ""
    echo -e "${GREEN}🎉 Build completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📦 Build Summary:${NC}"
    echo -e "  Edition: ${EDITION^}"
    echo -e "  Version:  ${VERSION}"
    echo ""
    echo -e "${BLUE}📁 Generated Files:${NC}"
    
    if [ "$EDITION" = "oss" ]; then
        echo -e "  🚀 Binary:     $OUTPUT_DIR/cryptobom-oss"
        echo -e "  🐳 Docker:     deploy/oss/docker/Dockerfile.oss"
        echo -e "  ☸️  K8s:        deploy/oss/k8s/"
        echo ""
        echo -e "${BLUE}🌐 OSS Features:${NC}"
        echo -e "  • eBPF cryptographic asset discovery"
        echo -e "  • Basic CBOM management"
        echo -e "  • Vulnerability detection"
        echo -e "  • Kubernetes integration"
        echo -e "  • Real-time monitoring"
        echo ""
        echo -e "${BLUE}🚀 Quick Start OSS:${NC}"
        echo -e "  $OUTPUT_DIR/cryptobom-oss"
    elif [ "$EDITION" = "core" ]; then
        echo -e "  🚀 Binary:     $OUTPUT_DIR/cryptobom-core"
        echo -e "  🐳 Docker:     deploy/core/docker/Dockerfile.core"
        echo ""
        echo -e "${BLUE}🌟 Core Features (auto-detected at runtime):${NC}"
        echo -e "  • Set CRYPTOBOM_LICENSE_KEY=ENT-... for Enterprise mode"
        echo -e "  • Run without for OSS mode (default)"
        echo -e "  • Enterprise port :9090, OSS port :8080"
        echo ""
        echo -e "${BLUE}🚀 Quick Start Core:${NC}"
        echo -e "  OSS:       $OUTPUT_DIR/cryptobom-core"
        echo -e "  Enterprise: CRYPTOBOM_LICENSE_KEY=ENT-xxxx $OUTPUT_DIR/cryptobom-core"
    else
        echo -e "  🚀 Binary:     $OUTPUT_DIR/cryptobom-enterprise"
        echo -e "  🐳 Docker:     deploy/enterprise/docker/Dockerfile.enterprise"
        echo -e "  ☸️  K8s:        deploy/enterprise/k8s/"
        echo ""
        echo -e "${BLUE}🔒 Enterprise Features:${NC}"
        echo -e "  • IBM Quantum attestation & verification"
        echo -e "  • Advanced threat detection with ML"
        echo -e "  • Multi-cloud deployment support"
        echo -e "  • Enterprise SSO (SAML/LDAP)"
        echo -e "  • Advanced analytics & reporting"
        echo -e "  • Premium support"
        echo ""
        echo -e "${BLUE}🚀 Quick Start Enterprise:${NC}"
        echo -e "  $OUTPUT_DIR/cryptobom-enterprise"
    fi
    
    echo ""
    echo -e "${BLUE}⚡ Server URLs:${NC}"
    if [ "$EDITION" = "oss" ]; then
        echo -e "  🌐 Dashboard:  http://localhost:8080"
        echo -e "  🔗 API:        http://localhost:8080/api/v1"
    elif [ "$EDITION" = "core" ]; then
        echo -e "  🌐 OSS:        http://localhost:8080 (no license key)"
        echo -e "  🔗 Enterprise: http://localhost:9090 (with license key)"
    else
        echo -e "  🌐 Dashboard:  http://localhost:9090"
        echo -e "  🔗 API:        http://localhost:9090/api/v1"
        echo -e "  ⚛️  IBMQ:       http://localhost:9090/api/v1/ibmq"
    fi
}

# Main build logic
case "$EDITION" in
    "core"|"unified"|"single")
        build_core
        ;;
    "oss"|"open-source"|"opensource")
        build_oss
        ;;
    "enterprise"|"ent"|"pro")
        build_enterprise
        ;;
    "help"|"-h"|"--help")
        show_usage
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Unknown edition: $EDITION${NC}"
        echo -e "${YELLOW}Use './build.sh help' for usage information${NC}"
        exit 1
        ;;
esac

create_version_info
show_summary