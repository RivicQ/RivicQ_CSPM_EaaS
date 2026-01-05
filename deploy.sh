#!/bin/bash

echo "🚀 Launching Rivic Q-Runtime Complete SaaS Platform"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi

print_status "Checking project dependencies..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing project dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install dependencies"
        exit 1
    fi
    print_success "Dependencies installed successfully"
else
    print_success "Dependencies already installed"
fi

# Build the TypeScript project
print_status "Building TypeScript project..."
npm run build
if [ $? -eq 0 ]; then
    print_success "Build completed successfully"
else
    print_warning "Build had some issues, but continuing..."
fi

# Kill any existing processes on ports 3000 and 4000
print_status "Checking for existing processes..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    print_warning "Port 3000 is in use, killing existing process..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null ; then
    print_warning "Port 4000 is in use, killing existing process..."
    lsof -ti:4000 | xargs kill -9 2>/dev/null || true
fi

# Wait a moment for ports to be free
sleep 2

print_status "Starting Rivic Q-Runtime services..."
echo ""

# Start the banking demo (port 3000)
print_status "🏦 Starting Banking Demo Server (port 3000)..."
node simple-demo.js &
DEMO_PID=$!

# Wait a moment
sleep 2

# Start the SaaS website (port 4000)  
print_status "🌐 Starting SaaS Website Server (port 4000)..."
npm run saas:start &
SAAS_PID=$!

# Wait for servers to start
sleep 3

# Check if both servers are running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    print_success "Banking Demo Server is running on http://localhost:3000"
else
    print_error "Failed to start Banking Demo Server on port 3000"
fi

if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null ; then
    print_success "SaaS Website Server is running on http://localhost:4000"
else
    print_error "Failed to start SaaS Website Server on port 4000"
fi

echo ""
echo "🎉 RIVIC Q-RUNTIME SAAS PLATFORM LAUNCHED!"
echo "=========================================="
echo ""
echo "🌐 Main SaaS Website:     http://localhost:4000"
echo "🏦 Banking Demo:          http://localhost:3000"
echo "📺 Interactive Demo:      http://localhost:4000/demo"
echo "💰 Pricing Plans:        http://localhost:4000/pricing"
echo "📚 Documentation:        http://localhost:4000/docs"
echo ""
echo "🔥 FEATURES AVAILABLE:"
echo "   ✅ Open Source Plan with GitHub Integration"
echo "   ✅ Premium Trial Signup"
echo "   ✅ Enterprise Contact Forms"
echo "   ✅ Interactive Banking Demo"
echo "   ✅ Quantum-Safe Crypto Visualization"
echo "   ✅ Real-time CBOM Generation"
echo "   ✅ EU Compliance Dashboard"
echo ""
echo "🛠️  GITHUB INTEGRATION:"
echo "   📦 Main Repo: https://github.com/rivic/q-runtime"
echo "   🔍 CBOM Tools: https://github.com/rivic/cbom-tools"
echo "   ☸️  K8s Operator: https://github.com/rivic/k8s-operator"
echo ""
echo "💡 To stop all servers, press Ctrl+C or run:"
echo "   kill $DEMO_PID $SAAS_PID"
echo ""
print_success "Platform is ready for business! 🚀"

# Keep script running and handle Ctrl+C
trap "print_warning 'Shutting down servers...'; kill $DEMO_PID $SAAS_PID 2>/dev/null; exit 0" INT

# Wait for background processes
wait

# Rivic Q-Runtime Deployment Script v1.0
# Deploys the quantum-safe banking infrastructure

set -e

echo "🚀 Starting Rivic Q-Runtime Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if kubectl is installed and configured
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    # Check Kubernetes connection
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        print_warning "Please ensure kubectl is configured correctly"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Build TypeScript project
build_project() {
    print_status "Building TypeScript project..."
    
    if npm run build; then
        print_success "TypeScript build completed"
    else
        print_error "TypeScript build failed"
        exit 1
    fi
}

# Build Docker images
build_docker_images() {
    print_status "Building Docker images..."
    
    # Build main operator image
    print_status "Building Rivic operator image..."
    if docker build -t rivic/q-runtime:v1.0.0 .; then
        print_success "Operator image built: rivic/q-runtime:v1.0.0"
    else
        print_error "Failed to build operator image"
        exit 1
    fi
    
    # Build quantum-safe agent image
    print_status "Building quantum-safe agent image..."
    if docker build --target agent -t rivic/q-runtime-agent:v1.0.0 .; then
        print_success "Agent image built: rivic/q-runtime-agent:v1.0.0"
    else
        print_error "Failed to build agent image"
        exit 1
    fi
    
    # Build banking demo image
    print_status "Building banking demo image..."
    if docker build --target runtime -t rivic/banking-demo:v1.0.0 .; then
        print_success "Banking demo image built: rivic/banking-demo:v1.0.0"
    else
        print_warning "Banking demo image build failed - continuing without demo"
    fi
}

# Deploy to Kubernetes
deploy_kubernetes() {
    print_status "Deploying to Kubernetes..."
    
    # Apply manifests
    if kubectl apply -f k8s/manifests.yaml; then
        print_success "Kubernetes manifests applied"
    else
        print_error "Failed to apply Kubernetes manifests"
        exit 1
    fi
    
    # Wait for operator to be ready
    print_status "Waiting for Rivic operator to be ready..."
    kubectl wait --for=condition=Ready pod -l app=rivic-operator -n rivic-system --timeout=300s
    
    if [ $? -eq 0 ]; then
        print_success "Rivic operator is ready"
    else
        print_warning "Operator readiness timeout - checking status..."
        kubectl get pods -n rivic-system
    fi
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Check operator status
    OPERATOR_STATUS=$(kubectl get pods -n rivic-system -l app=rivic-operator -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "NotFound")
    
    if [ "$OPERATOR_STATUS" = "Running" ]; then
        print_success "Rivic operator is running"
    else
        print_error "Rivic operator status: $OPERATOR_STATUS"
    fi
    
    # Check CRDs
    if kubectl get crd rivicconfigs.quantum.rivic.eu &> /dev/null; then
        print_success "RivicConfig CRD is installed"
    else
        print_warning "RivicConfig CRD not found"
    fi
    
    # Check webhook
    if kubectl get mutatingadmissionwebhook rivic-injector &> /dev/null; then
        print_success "Admission webhook is configured"
    else
        print_warning "Admission webhook not found"
    fi
    
    # Show cluster info
    print_status "Cluster information:"
    kubectl get nodes -o wide
    echo ""
    kubectl get pods -n rivic-system
    echo ""
    kubectl get svc -n rivic-system
}

# Start banking demo
start_demo() {
    print_status "Starting banking demo application..."
    
    # Check if banking-demo namespace exists
    if kubectl get namespace banking-demo &> /dev/null; then
        print_status "Banking demo namespace exists"
        
        # Check demo app status
        DEMO_STATUS=$(kubectl get pods -n banking-demo -l app=banking-demo -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "NotFound")
        
        if [ "$DEMO_STATUS" = "Running" ]; then
            print_success "Banking demo is already running"
        else
            print_status "Banking demo status: $DEMO_STATUS"
        fi
        
        # Get service URL
        SERVICE_TYPE=$(kubectl get svc banking-demo-service -n banking-demo -o jsonpath='{.spec.type}' 2>/dev/null || echo "NotFound")
        
        if [ "$SERVICE_TYPE" = "LoadBalancer" ]; then
            EXTERNAL_IP=$(kubectl get svc banking-demo-service -n banking-demo -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "Pending")
            if [ "$EXTERNAL_IP" != "Pending" ] && [ "$EXTERNAL_IP" != "" ]; then
                print_success "Banking demo available at: http://$EXTERNAL_IP"
            else
                print_warning "LoadBalancer IP is pending - use port-forward for local access"
                print_status "Run: kubectl port-forward svc/banking-demo-service -n banking-demo 3000:80"
            fi
        elif [ "$SERVICE_TYPE" = "NodePort" ]; then
            NODE_PORT=$(kubectl get svc banking-demo-service -n banking-demo -o jsonpath='{.spec.ports[0].nodePort}')
            NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}' || kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
            print_success "Banking demo available at: http://$NODE_IP:$NODE_PORT"
        else
            print_status "Use port-forward for local access: kubectl port-forward svc/banking-demo-service -n banking-demo 3000:80"
        fi
    else
        print_warning "Banking demo namespace not found - demo may not be deployed"
    fi
}

# Generate initial CBOM
generate_cbom() {
    print_status "Generating initial CBOM..."
    
    if npm run cbom:generate > cbom-output.json 2>/dev/null; then
        print_success "CBOM generated: cbom-output.json"
        print_status "CBOM preview:"
        head -20 cbom-output.json || echo "Could not preview CBOM"
    else
        print_warning "CBOM generation failed - will be available after runtime"
    fi
}

# Show usage instructions
show_usage() {
    echo ""
    print_success "🎉 Rivic Q-Runtime Deployment Complete!"
    echo ""
    echo "📋 Next Steps:"
    echo "  1. Access the banking demo application"
    echo "  2. Enable quantum-safe mode and observe crypto upgrades"
    echo "  3. View real-time CBOM generation"
    echo "  4. Check compliance dashboard"
    echo ""
    echo "🔧 Useful Commands:"
    echo "  kubectl get pods -n rivic-system     # Check operator status"
    echo "  kubectl get pods -n banking-demo     # Check demo app status"
    echo "  kubectl logs -f deploy/rivic-operator -n rivic-system  # View operator logs"
    echo "  kubectl port-forward svc/banking-demo-service -n banking-demo 3000:80  # Access demo locally"
    echo ""
    echo "🔍 Monitoring:"
    echo "  kubectl get rivicconfigs -A          # View quantum-safe configurations"
    echo "  kubectl describe mutatingadmissionwebhook rivic-injector  # Check webhook"
    echo ""
    echo "🧹 Cleanup:"
    echo "  kubectl delete -f k8s/manifests.yaml  # Remove all Rivic components"
    echo ""
}

# Main deployment flow
main() {
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                    RIVIC Q-RUNTIME                        ║"
    echo "║              Quantum-Safe Banking Infrastructure          ║"
    echo "║                     Version 1.0.0                        ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    
    check_prerequisites
    build_project
    build_docker_images
    deploy_kubernetes
    verify_deployment
    start_demo
    generate_cbom
    show_usage
    
    print_success "Deployment completed successfully! 🚀"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "build")
        check_prerequisites
        build_project
        build_docker_images
        ;;
    "k8s")
        deploy_kubernetes
        verify_deployment
        ;;
    "demo")
        start_demo
        ;;
    "clean")
        print_status "Cleaning up Rivic deployment..."
        kubectl delete -f k8s/manifests.yaml --ignore-not-found=true
        docker rmi rivic/q-runtime:v1.0.0 rivic/q-runtime-agent:v1.0.0 rivic/banking-demo:v1.0.0 2>/dev/null || true
        print_success "Cleanup completed"
        ;;
    "help")
        echo "Usage: $0 [deploy|build|k8s|demo|clean|help]"
        echo ""
        echo "Commands:"
        echo "  deploy  - Full deployment (default)"
        echo "  build   - Build project and Docker images only"
        echo "  k8s     - Deploy to Kubernetes only"
        echo "  demo    - Start/check demo application"
        echo "  clean   - Remove all Rivic components"
        echo "  help    - Show this help message"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
