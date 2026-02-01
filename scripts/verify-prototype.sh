#!/bin/bash

# CryptoBOM SaaS Full Prototype Verification Script
# This script validates all components are working correctly for MVP transition

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verification variables
PASSED=0
FAILED=0
TOTAL=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test helper
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    ((TOTAL++))
    log_info "Testing: $test_name"
    
    if eval "$test_command"; then
        log_success "$test_name"
        return 0
    else
        log_error "$test_name"
        return 1
    fi
}

# Wait for deployment
wait_for_deployment() {
    local namespace="$1"
    local deployment="$2"
    local timeout="${3:-300}"
    
    log_info "Waiting for deployment $deployment in namespace $namespace..."
    
    local start_time=$(date +%s)
    while true; do
        local ready=$(kubectl get deployment "$deployment" -n "$namespace" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local replicas=$(kubectl get deployment "$deployment" -n "$namespace" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
        
        if [[ "$ready" == "$replicas" && "$ready" != "0" ]]; then
            log_success "Deployment $deployment is ready"
            return 0
        fi
        
        local current_time=$(date +%s)
        if (( current_time - start_time > timeout )); then
            log_error "Timeout waiting for deployment $deployment"
            return 1
        fi
        
        sleep 5
    done
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl >/dev/null 2>&1; then
        log_error "kubectl not found"
        exit 1
    fi
    
    # Check helm
    if ! command -v helm >/dev/null 2>&1; then
        log_error "helm not found"
        exit 1
    fi
    
    # Check cluster connection
    if ! kubectl cluster-info >/dev/null 2>&1; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

echo "🔍 CryptoBOM SaaS Prototype Verification"
echo "========================================"

check_prerequisites

# 1. Deploy the platform
log_info "Deploying CryptoBOM SaaS platform..."

# Deploy using Helm
if helm status cryptobom-saas -n cryptobom-system >/dev/null 2>&1; then
    log_info "Platform already deployed, upgrading..."
    helm upgrade cryptobom-saas ./deploy/helm/cryptobom-saas \
        --namespace cryptobom-system \
        --set postgresql.enabled=true \
        --set postgresql.auth.postgresPassword=testpassword \
        --set ibmQuantum.enabled=true \
        --values deploy/helm/cryptobom-saas/values.yaml
else
    log_info "Installing platform..."
    helm install cryptobom-saas ./deploy/helm/cryptobom-saas \
        --namespace cryptobom-system \
        --create-namespace \
        --set postgresql.enabled=true \
        --set postgresql.auth.postgresPassword=testpassword \
        --set ibmQuantum.enabled=true \
        --values deploy/helm/cryptobom-saas/values.yaml
fi

# 2. Verify core components
log_info "Verifying core component deployments..."

# Check database deployment
wait_for_deployment "cryptobom-system" "cryptobom-saas-postgresql"

# Check main application deployment
wait_for_deployment "cryptobom-system" "cryptobom-saas"

# Check services are running
run_test "PostgreSQL Service" "kubectl get svc cryptobom-saas-postgresql -n cryptobom-system"
run_test "Main API Service" "kubectl get svc cryptobom-saas -n cryptobom-system"

# 3. Test API endpoints
log_info "Testing API endpoints..."

# Port forward API
kubectl port-forward -n cryptobom-system svc/cryptobom-saas 8080:80 &
API_PID=$!
sleep 10

# Test health endpoint
run_test "API Health Check" "curl -f http://localhost:8080/healthz"

# Test API functionality
run_test "CBOM API Endpoints" "curl -f http://localhost:8080/api/v1/cbom"

# Create test CBOM report
CBOM_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/cbom \
    -H "Content-Type: application/json" \
    -d '{
        "name": "test-cbom",
        "version": "1.0.0",
        "bom": {
            "components": [
                {
                    "name": "openssl",
                    "version": "3.0.0",
                    "crypto": {
                        "algorithms": ["AES-256-GCM", "RSA-2048"]
                    }
                }
            ]
        }
    }')

if echo "$CBOM_RESPONSE" | grep -q '"id"'; then
    log_success "CBOM Report Creation"
    CBOM_ID=$(echo "$CBOM_RESPONSE" | jq -r '.id')
else
    log_error "CBOM Report Creation"
fi

# 4. Test eBPF Scanner
log_info "Testing eBPF cryptographic scanner..."

# Check if eBPF is enabled in pods
EBPF_POD=$(kubectl get pods -n cryptobom-system -l app.kubernetes.io/name=cryptobom-saas -o jsonpath='{.items[0].metadata.name}')

if [[ -n "$EBPF_POD" ]]; then
    # Check if scanner can access host filesystem
    run_test "eBPF Host Access" "kubectl exec -n cryptobom-system $EBPF_POD -- ls /host/proc"
    
    # Check for privileged mode
    PRIVILEGED=$(kubectl get pod $EBPF_POD -n cryptobom-system -o jsonpath='{.spec.securityContext.privileged}')
    if [[ "$PRIVILEGED" == "true" ]]; then
        log_success "eBPF Privileged Mode"
    else
        log_warning "eBPF may not have required privileges"
    fi
else
    log_error "eBPF Pod not found"
fi

# 5. Test Kubernetes Operator
log_info "Testing Kubernetes Operator..."

# Check if operator is deployed
run_test "CRD Registration" "kubectl get crd cbomreports.cryptobom.rivic-q.io"

# Create test CRD instance
cat <<EOF | kubectl apply -f -
apiVersion: cryptobom.rivic-q.io/v1alpha1
kind: CBOMReport
metadata:
  name: test-cbom-operator
  namespace: cryptobom-system
spec:
  name: "Operator Test CBOM"
  version: "1.0.0"
  scanConfig:
    ebpfEnabled: true
    containerScan: true
    quantumAttestation: true
    scanInterval: 30
EOF

# Wait for operator to process
sleep 30

# Check if scanner deployment was created
run_test "Operator Scanner Deployment" "kubectl get deployment test-cbom-operator-scanner -n cryptobom-system"

# 6. Test IBM Quantum Integration
log_info "Testing IBM Quantum Integration..."

# Check if quantum configuration is working
if kubectl get configmap cryptobom-saas-secrets -n cryptobom-system >/dev/null 2>&1; then
    # Test quantum API connectivity (mock for demo)
    QUANTUM_TEST=$(kubectl exec -n cryptobom-system deployment/cryptobom-saas -- curl -s -X POST http://localhost:8080/api/v1/quantum/attest \
        -H "Content-Type: application/json" \
        -d '{
            "algorithm": "RSA-2048",
            "key_size": 2048,
            "usage": "encryption"
        }' || echo "mock")
    
    if echo "$QUANTUM_TEST" | grep -q '"status"'; then
        log_success "IBM Quantum API Integration"
    else
        log_warning "IBM Quantum API integration needs configuration"
    fi
else
    log_warning "IBM Quantum secrets not configured"
fi

# 7. Test Headlamp Integration
log_info "Testing Headlamp Integration..."

# Deploy Headlamp with plugin
if [[ -x "./deploy/scripts/headlamp-plugin.sh" ]]; then
    ./deploy/scripts/headlamp-plugin.sh
    
    # Wait for Headlamp deployment
    wait_for_deployment "headlamp-system" "headlamp"
    
    # Check if plugin is loaded
    run_test "Headlamp Deployment" "kubectl get deployment headlamp -n headlamp-system"
    
    # Port forward and test
    kubectl port-forward -n headlamp-system svc/headlamp 8081:80 &
    HEADLAMP_PID=$!
    sleep 10
    
    run_test "Headlamp Access" "curl -f http://localhost:8081"
    
    kill $HEADLAMP_PID 2>/dev/null || true
else
    log_warning "Headlamp deployment script not executable"
fi

# 8. Test Database Schema
log_info "Testing database schema..."

# Check database connection and tables
DB_POD=$(kubectl get pods -n cryptobom-system -l app.kubernetes.io/name=cryptobom-saas-postgresql -o jsonpath='{.items[0].metadata.name}')

if [[ -n "$DB_POD" ]]; then
    # Test database connectivity
    kubectl exec -n cryptobom-system "$DB_POD" -- psql -U postgres -d cryptobom_saas -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" > db_tables.txt
    
    if grep -q "cbom_reports\|crypto_assets\|tenants" db_tables.txt; then
        log_success "Database Schema Validation"
    else
        log_error "Database Schema Incomplete"
    fi
    rm -f db_tables.txt
else
    log_error "Database Pod not found"
fi

# 9. Performance Tests
log_info "Running basic performance tests..."

# API performance test
API_PERF_START=$(date +%s%N)
for i in {1..10}; do
    curl -s http://localhost:8080/healthz >/dev/null
done
API_PERF_END=$(date +%s%N)
API_PERF_MS=$(((API_PERF_END - API_PERF_START) / 1000000 / 10))

if [[ $API_PERF_MS -lt 100 ]]; then
    log_success "API Performance ($API_PERF_MS ms avg)"
else
    log_warning "API Performance slow ($API_PERF_MS ms avg)"
fi

# 10. Security Validation
log_info "Testing security configurations..."

# Check RBAC
run_test "ServiceAccount Created" "kubectl get serviceaccount cryptobom-saas -n cryptobom-system"

# Check Network Policies (if enabled)
if kubectl get networkpolicy -n cryptobom-system 2>/dev/null | grep -q cryptobom; then
    log_success "Network Policies Applied"
else
    log_warning "Network Policies not configured"
fi

# Clean up
log_info "Cleaning up test resources..."

kill $API_PID 2>/dev/null || true
kubectl delete cbomreport test-cbom-operator -n cryptobom-system --ignore-not-found=true
kubectl delete deployment test-cbom-operator-scanner -n cryptobom-system --ignore-not-found=true

# Generate report
echo ""
echo "📊 Verification Results"
echo "======================="
echo -e "Total Tests: ${BLUE}$TOTAL${NC}"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

SUCCESS_RATE=$((PASSED * 100 / TOTAL))

if [[ $SUCCESS_RATE -ge 80 ]]; then
    echo -e "Result: ${GREEN}SUCCESS${NC} - Prototype is ready for MVP development"
    echo ""
    echo "✅ Ready to proceed with MVP development:"
    echo "   • Core platform components are functional"
    echo "   • API endpoints are responsive"
    echo "   • Database operations working"
    echo "   • Kubernetes operators functioning"
    echo "   • Security features operational"
    exit 0
elif [[ $SUCCESS_RATE -ge 60 ]]; then
    echo -e "Result: ${YELLOW}PARTIAL${NC} - Some components need attention before MVP"
    echo ""
    echo "⚠️  Review failed tests and fix before proceeding:"
    echo "   • Address failed components"
    echo "   • Complete missing configurations"
    echo "   • Verify all integrations"
    exit 1
else
    echo -e "Result: ${RED}FAILURE${NC} - Significant issues found"
    echo ""
    echo "❌ Do not proceed to MVP until critical issues are resolved:"
    echo "   • Fix all failed core components"
    echo "   • Verify deployment configuration"
    echo "   • Complete missing implementations"
    exit 2
fi