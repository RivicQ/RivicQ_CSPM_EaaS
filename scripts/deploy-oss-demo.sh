#!/bin/bash

# CryptoBOM SaaS - Open Source Demo Deployment Script
# This script deploys the OSS version for LinkedIn demo

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="cryptobom-system"
CHART_PATH="./deploy/helm/cryptobom-oss"
VALUES_FILE="./deploy/helm/cryptobom-oss/values.yaml"
DEMO_MODE="true"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check helm
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed or not in PATH"
        exit 1
    fi
    
    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create namespace
create_namespace() {
    log_info "Creating namespace: $NAMESPACE"
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    log_success "Namespace created/verified"
}

# Add Helm repositories
add_helm_repos() {
    log_info "Adding Helm repositories..."
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    log_success "Helm repositories added"
}

# Create demo values
create_demo_values() {
    log_info "Creating demo configuration..."
    
    cat > ${VALUES_FILE}.demo.yaml << EOF
# CryptoBOM OSS Demo Configuration
global:
  demoMode: true
  imagePullPolicy: IfNotPresent

api:
  replicaCount: 2
  image:
    repository: rivicq/cryptobom-oss
    tag: "latest"
  service:
    type: LoadBalancer
    port: 80
    targetPort: 8080
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 100m
      memory: 128Mi
  demoData:
    enabled: true

database:
  enabled: true
  postgresql:
    auth:
      postgresPassword: "cryptobom123"
      database: "cryptobom"
    primary:
      persistence:
        enabled: true
        size: 1Gi
    resources:
      limits:
        cpu: 500m
        memory: 512Mi
      requests:
        cpu: 100m
        memory: 256Mi

redis:
  enabled: true
  auth:
    enabled: false
  master:
    persistence:
      enabled: true
      size: 256Mi
  resources:
    limits:
      cpu: 200m
      memory: 256Mi
    requests:
      cpu: 50m
      memory: 64Mi

prometheus:
  enabled: true
  server:
    resources:
      limits:
        cpu: 500m
        memory: 512Mi
      requests:
        cpu: 100m
        memory: 128Mi

headlamp:
  enabled: true
  plugins:
    cryptobom:
      enabled: true

demo:
  enabled: true
  sampleData: true
  autoScan: true
  webUI: true
  
ingress:
  enabled: true
  className: "nginx"
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
  hosts:
    - host: cryptobom-demo.local
      paths:
        - path: /
          pathType: Prefix
  tls: []

monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    namespace: $NAMESPACE

security:
  rbac:
    create: true
  serviceAccount:
    create: true
    name: cryptobom-oss

EOF

    log_success "Demo configuration created"
}

# Deploy CryptoBOM OSS
deploy_cryptobom() {
    log_info "Deploying CryptoBOM OSS..."
    
    # First, ensure PostgreSQL and Redis are deployed
    log_info "Deploying dependencies..."
    helm upgrade --install postgresql bitnami/postgresql \
        --namespace $NAMESPACE \
        --set auth.postgresPassword=cryptobom123 \
        --set auth.database=cryptobom \
        --set primary.persistence.size=1Gi \
        --wait
    
    helm upgrade --install redis bitnami/redis \
        --namespace $NAMESPACE \
        --set auth.enabled=false \
        --set master.persistence.size=256Mi \
        --wait
    
    # Deploy Prometheus for monitoring
    log_info "Deploying Prometheus..."
    helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
        --namespace $NAMESPACE \
        --set prometheus.prometheus.spec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=2Gi \
        --set grafana.persistence.size=1Gi \
        --wait
    
    # Deploy CryptoBOM OSS
    log_info "Deploying CryptoBOM OSS application..."
    helm upgrade --install cryptobom-oss $CHART_PATH \
        --namespace $NAMESPACE \
        --values ${VALUES_FILE}.demo.yaml \
        --wait
    
    log_success "CryptoBOM OSS deployed successfully"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check pods
    kubectl get pods -n $NAMESPACE
    
    # Wait for pods to be ready
    log_info "Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=cryptobom-oss -n $NAMESPACE --timeout=300s
    
    # Check services
    log_info "Checking services..."
    kubectl get services -n $NAMESPACE
    
    # Check API health
    log_info "Checking API health..."
    kubectl port-forward -n $NAMESPACE svc/cryptobom-oss 8080:80 &
    PF_PID=$!
    
    sleep 5
    
    if curl -s http://localhost:8080/healthz > /dev/null; then
        log_success "API is healthy"
    else
        log_error "API health check failed"
    fi
    
    kill $PF_PID 2>/dev/null || true
    
    log_success "Deployment verification completed"
}

# Generate demo data
generate_demo_data() {
    log_info "Generating demo data..."
    
    # Create sample CBOM reports
    kubectl port-forward -n $NAMESPACE svc/cryptobom-oss 8080:80 &
    PF_PID=$!
    
    sleep 3
    
    # Create sample CBOM report
    curl -X POST http://localhost:8080/api/v1/cbom \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Production Infrastructure CBOM",
            "version": "1.0.0",
            "assets": [
                {
                    "name": "Kubernetes Ingress TLS",
                    "algorithm": "RSA-2048",
                    "key_size": 2048,
                    "location": "ingress-controller",
                    "risk_level": "medium",
                    "quantum_safe": false
                },
                {
                    "name": "Database Encryption",
                    "algorithm": "AES-256",
                    "key_size": 256,
                    "location": "postgresql-master",
                    "risk_level": "low",
                    "quantum_safe": true
                },
                {
                    "name": "API Gateway Certificate",
                    "algorithm": "ECDSA-256",
                    "key_size": 256,
                    "location": "api-gateway",
                    "risk_level": "low",
                    "quantum_safe": false
                }
            ]
        }' | jq '.'
    
    # Trigger a scan
    curl -X POST http://localhost:8080/api/v1/discovery/scan \
        -H "Content-Type: application/json" \
        -d '{
            "scope": ["kubernetes", "containers"],
            "options": {
                "deep_scan": true,
                "include_system": false
            }
        }' | jq '.'
    
    kill $PF_PID 2>/dev/null || true
    
    log_success "Demo data generated"
}

# Display access information
display_access_info() {
    log_info "Displaying access information..."
    
    echo ""
    echo "🚀 CryptoBOM OSS Demo is ready!"
    echo ""
    echo "📊 Access the Demo:"
    echo "   API Endpoint: http://localhost:8080"
    echo "   Health Check: http://localhost:8080/healthz"
    echo ""
    echo "🔧 To access the API locally:"
    echo "   kubectl port-forward -n $NAMESPACE svc/cryptobom-oss 8080:80"
    echo ""
    echo "📈 To access monitoring:"
    echo "   kubectl port-forward -n $NAMESPACE svc/prometheus-grafana 3000:80"
    echo "   Grafana URL: http://localhost:3000 (admin/admin)"
    echo ""
    echo "🔍 Example API calls:"
    echo "   curl http://localhost:8080/api/v1/cbom"
    echo "   curl http://localhost:8080/api/v1/metrics/overview"
    echo "   curl http://localhost:8080/api/v1/assets"
    echo ""
    echo "📱 For LinkedIn Demo:"
    echo "   1. Port forward: kubectl port-forward -n $NAMESPACE svc/cryptobom-oss 8080:80"
    echo "   2. Open browser: http://localhost:8080"
    echo "   3. Show real-time CBOM dashboard"
    echo "   4. Demonstrate live scanning capabilities"
    echo ""
    
    log_success "Demo setup complete! 🎉"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    # Kill any remaining port forwards
    pkill -f "kubectl port-forward" || true
}

# Main execution
main() {
    log_info "🚀 Starting CryptoBOM OSS Demo Deployment"
    
    # Set up cleanup trap
    trap cleanup EXIT
    
    # Run deployment steps
    check_prerequisites
    create_namespace
    add_helm_repos
    create_demo_values
    deploy_cryptobom
    verify_deployment
    generate_demo_data
    display_access_info
    
    log_success "🎉 CryptoBOM OSS Demo deployed successfully!"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "cleanup")
        log_info "Cleaning up demo deployment..."
        helm uninstall cryptobom-oss -n $NAMESPACE || true
        helm uninstall postgresql -n $NAMESPACE || true
        helm uninstall redis -n $NAMESPACE || true
        helm uninstall prometheus -n $NAMESPACE || true
        kubectl delete namespace $NAMESPACE || true
        log_success "Cleanup completed"
        ;;
    "verify")
        verify_deployment
        ;;
    *)
        echo "Usage: $0 {deploy|cleanup|verify}"
        echo "  deploy  - Deploy the demo (default)"
        echo "  cleanup - Clean up the deployment"
        echo "  verify  - Verify the deployment"
        exit 1
        ;;
esac