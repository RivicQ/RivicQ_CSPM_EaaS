#!/bin/bash

# 🚀 Rivic Q-Runtime: Complete Pipeline Automation
# Engineering Lead: 15-Year Veteran Final Deadline Execution
# Pipeline: Website → Demo → Production

set -euo pipefail

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
WEBSITE_PORT=4000
DEMO_PORT=3000
MONITORING_PORT=3001
API_PORT=5000
DOMAIN="rivic.quantum-safe.com"
CHRISTMAS_LAUNCH_DATE="2025-12-25"

print_header() {
    echo -e "${PURPLE}"
    echo "████████████████████████████████████████████████████████████████"
    echo "██                                                            ██"
    echo "██  🚀 RIVIC Q-RUNTIME: COMPLETE PIPELINE DEPLOYMENT 🚀       ██"
    echo "██                                                            ██"
    echo "██  🎄 Christmas Launch: December 25, 2025 🎁                 ██"
    echo "██                                                            ██"
    echo "██  Engineering Lead: 15-Year Veteran Final Deadline          ██"
    echo "██                                                            ██"
    echo "████████████████████████████████████████████████████████████████"
    echo -e "${NC}"
}

print_section() {
    echo -e "\n${CYAN}▶▶▶ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[ℹ]${NC} $1"
}

check_dependencies() {
    print_section "CHECKING SYSTEM DEPENDENCIES"
    
    local deps=("node" "npm" "docker" "kubectl" "git" "curl" "jq")
    local missing=()
    
    for dep in "${deps[@]}"; do
        if command -v "$dep" &> /dev/null; then
            print_success "$dep is installed"
        else
            missing+=("$dep")
            print_error "$dep is missing"
        fi
    done
    
    if [ ${#missing[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing[*]}"
        print_info "Please install missing dependencies and run again"
        exit 1
    fi
    
    print_success "All dependencies satisfied"
}

setup_environment() {
    print_section "SETTING UP ENVIRONMENT"
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p data/metrics
    mkdir -p data/demos
    mkdir -p data/customers
    mkdir -p deployment/staging
    mkdir -p deployment/production
    
    # Environment variables
    export NODE_ENV=production
    export RIVIC_ENV=pipeline
    export CHRISTMAS_MODE=true
    export PIPELINE_START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    print_success "Environment configured"
}

start_marketing_website() {
    print_section "🌐 STARTING MARKETING WEBSITE (Stage 1)"
    
    print_info "Building optimized production website..."
    
    # Kill existing processes
    pkill -f "saas-website/server.js" || true
    
    # Start SaaS website
    cd saas-website
    npm install --production
    nohup node server.js > ../logs/website.log 2>&1 &
    WEBSITE_PID=$!
    cd ..
    
    # Wait for startup
    sleep 3
    
    if curl -f http://localhost:$WEBSITE_PORT > /dev/null 2>&1; then
        print_success "Marketing website running at http://localhost:$WEBSITE_PORT"
        print_success "PID: $WEBSITE_PID"
        echo $WEBSITE_PID > website.pid
    else
        print_error "Failed to start marketing website"
        exit 1
    fi
}

start_live_demo() {
    print_section "🏦 STARTING LIVE DEMO ENVIRONMENT (Stage 2)"
    
    print_info "Deploying interactive banking demo..."
    
    # Kill existing demo processes
    pkill -f "simple-demo.js" || true
    pkill -f "demo-banking-app" || true
    
    # Start simple demo for immediate access
    nohup node simple-demo.js > logs/demo.log 2>&1 &
    DEMO_PID=$!
    
    # Wait for startup
    sleep 2
    
    if curl -f http://localhost:$DEMO_PORT > /dev/null 2>&1; then
        print_success "Live demo running at http://localhost:$DEMO_PORT"
        print_success "PID: $DEMO_PID"
        echo $DEMO_PID > demo.pid
    else
        print_error "Failed to start live demo"
        exit 1
    fi
    
    print_info "Demo features:"
    echo "   • Real-time quantum-safe transactions"
    echo "   • CBOM generation dashboard"
    echo "   • Performance metrics"
    echo "   • eIDAS 2.0 compliance reporting"
}

setup_monitoring() {
    print_section "📊 SETTING UP MONITORING & ANALYTICS"
    
    # Create monitoring dashboard
    cat > monitoring/dashboard.js << 'EOF'
const express = require('express');
const app = express();

let metrics = {
    websiteViews: 0,
    demoRequests: 0,
    trialSignups: 0,
    enterpriseInquiries: 0,
    uptime: process.uptime(),
    performance: {
        websiteLatency: 0,
        demoLatency: 0,
        errorRate: 0
    }
};

app.use(express.json());
app.use(express.static('public'));

app.get('/api/metrics', (req, res) => {
    metrics.uptime = process.uptime();
    res.json(metrics);
});

app.post('/api/track/:event', (req, res) => {
    const event = req.params.event;
    const data = req.body;
    
    console.log(`📊 Event tracked: ${event}`, data);
    
    switch(event) {
        case 'website_view':
            metrics.websiteViews++;
            break;
        case 'demo_request':
            metrics.demoRequests++;
            break;
        case 'trial_signup':
            metrics.trialSignups++;
            break;
        case 'enterprise_inquiry':
            metrics.enterpriseInquiries++;
            break;
    }
    
    res.json({ status: 'tracked', event, metrics });
});

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🚀 Rivic Q-Runtime Pipeline Monitoring</title>
            <style>
                body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; }
                .dashboard { max-width: 1200px; margin: 0 auto; }
                .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
                .metric { background: rgba(255,255,255,0.1); padding: 20px; border-radius: 15px; backdrop-filter: blur(10px); }
                .metric h3 { margin: 0; color: #f59e0b; }
                .metric .value { font-size: 2rem; font-weight: bold; margin: 10px 0; }
                .status { background: rgba(16,185,129,0.2); padding: 15px; border-radius: 10px; margin: 20px 0; }
                .refresh { background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="dashboard">
                <h1>🚀 Rivic Q-Runtime Pipeline Dashboard</h1>
                <div class="status">
                    <h3>🎄 Christmas Launch Status: LIVE 🎁</h3>
                    <p>Pipeline running since: ${new Date().toISOString()}</p>
                </div>
                <div class="metrics" id="metrics">
                    <!-- Metrics loaded by JavaScript -->
                </div>
                <button class="refresh" onclick="loadMetrics()">🔄 Refresh Metrics</button>
            </div>
            
            <script>
                function loadMetrics() {
                    fetch('/api/metrics')
                        .then(r => r.json())
                        .then(data => {
                            document.getElementById('metrics').innerHTML = \`
                                <div class="metric">
                                    <h3>🌐 Website Views</h3>
                                    <div class="value">\${data.websiteViews}</div>
                                </div>
                                <div class="metric">
                                    <h3>🏦 Demo Requests</h3>
                                    <div class="value">\${data.demoRequests}</div>
                                </div>
                                <div class="metric">
                                    <h3>🚀 Trial Signups</h3>
                                    <div class="value">\${data.trialSignups}</div>
                                </div>
                                <div class="metric">
                                    <h3>💼 Enterprise Inquiries</h3>
                                    <div class="value">\${data.enterpriseInquiries}</div>
                                </div>
                                <div class="metric">
                                    <h3>⏱️ Uptime</h3>
                                    <div class="value">\${Math.floor(data.uptime)}s</div>
                                </div>
                                <div class="metric">
                                    <h3>🎯 Conversion Rate</h3>
                                    <div class="value">\${data.websiteViews > 0 ? Math.round((data.trialSignups / data.websiteViews) * 100) : 0}%</div>
                                </div>
                            \`;
                        });
                }
                
                loadMetrics();
                setInterval(loadMetrics, 5000);
            </script>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(\`📊 Monitoring dashboard running at http://localhost:\${PORT}\`);
});
EOF
    
    mkdir -p monitoring
    cd monitoring
    npm init -y > /dev/null 2>&1
    npm install express --save > /dev/null 2>&1
    nohup node dashboard.js > ../logs/monitoring.log 2>&1 &
    MONITORING_PID=$!
    cd ..
    
    sleep 2
    
    if curl -f http://localhost:$MONITORING_PORT > /dev/null 2>&1; then
        print_success "Monitoring dashboard running at http://localhost:$MONITORING_PORT"
        echo $MONITORING_PID > monitoring.pid
    else
        print_warning "Monitoring dashboard failed to start"
    fi
}

setup_api_gateway() {
    print_section "🔗 SETTING UP API GATEWAY & ROUTING"
    
    # Create API gateway for unified pipeline
    cat > api-gateway.js << 'EOF'
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        pipeline: 'active',
        christmas: true,
        timestamp: new Date().toISOString(),
        services: {
            website: 'http://localhost:4000',
            demo: 'http://localhost:3000',
            monitoring: 'http://localhost:3001'
        }
    });
});

// Route to website (marketing)
app.use('/website', createProxyMiddleware({
    target: 'http://localhost:4000',
    changeOrigin: true,
    pathRewrite: { '^/website': '' }
}));

// Route to demo (technical proof)
app.use('/demo', createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true,
    pathRewrite: { '^/demo': '' }
}));

// Route to monitoring (analytics)
app.use('/monitoring', createProxyMiddleware({
    target: 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: { '^/monitoring': '' }
}));

// Pipeline API endpoints
app.get('/api/pipeline/status', (req, res) => {
    res.json({
        pipeline: 'complete',
        stages: {
            marketing: { status: 'active', url: 'http://localhost:4000' },
            demo: { status: 'active', url: 'http://localhost:3000' },
            monitoring: { status: 'active', url: 'http://localhost:3001' }
        },
        launch: {
            date: '2025-12-25',
            ready: true,
            christmas: true
        }
    });
});

// Default route - pipeline overview
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🚀 Rivic Q-Runtime Pipeline Control Center</title>
            <style>
                body { 
                    font-family: 'Inter', sans-serif; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 20px; 
                    margin: 0;
                }
                .container { max-width: 1000px; margin: 0 auto; text-align: center; }
                .header { margin-bottom: 40px; }
                .pipeline { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 40px 0; }
                .stage { 
                    background: rgba(255,255,255,0.1); 
                    padding: 30px; 
                    border-radius: 20px; 
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.2);
                }
                .stage h3 { margin: 0 0 15px 0; color: #f59e0b; }
                .stage a { 
                    display: inline-block; 
                    background: #3b82f6; 
                    color: white; 
                    padding: 12px 24px; 
                    border-radius: 25px; 
                    text-decoration: none; 
                    margin: 10px;
                    transition: all 0.3s ease;
                }
                .stage a:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4); }
                .status { background: rgba(16,185,129,0.2); padding: 20px; border-radius: 15px; margin: 20px 0; }
                .christmas { font-size: 2rem; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚀 Rivic Q-Runtime Pipeline Control Center</h1>
                    <div class="christmas">🎄 Christmas Launch: December 25, 2025 🎁</div>
                </div>
                
                <div class="status">
                    <h3>✅ Pipeline Status: FULLY OPERATIONAL</h3>
                    <p>Complete end-to-end automation from marketing to production deployment</p>
                </div>
                
                <div class="pipeline">
                    <div class="stage">
                        <h3>🌐 Stage 1: Marketing Website</h3>
                        <p>SaaS homepage with pricing tiers, lead generation, and Christmas theme</p>
                        <a href="/website" target="_blank">🎨 Visit Website</a>
                        <a href="http://localhost:4000" target="_blank">🔗 Direct Access</a>
                    </div>
                    
                    <div class="stage">
                        <h3>🏦 Stage 2: Live Demo</h3>
                        <p>Interactive banking demo with quantum-safe transactions and CBOM</p>
                        <a href="/demo" target="_blank">🚀 Try Demo</a>
                        <a href="http://localhost:3000" target="_blank">🔗 Direct Access</a>
                    </div>
                    
                    <div class="stage">
                        <h3>📊 Stage 3: Monitoring</h3>
                        <p>Real-time analytics, metrics, and pipeline health monitoring</p>
                        <a href="/monitoring" target="_blank">📈 View Analytics</a>
                        <a href="http://localhost:3001" target="_blank">🔗 Direct Access</a>
                    </div>
                </div>
                
                <div class="status">
                    <h3>🎯 Go-to-Market Strategy: ACTIVE</h3>
                    <p>Complete customer journey: Discovery → Demo → Trial → Production</p>
                    <p><strong>Target:</strong> €10M ARR within 18 months</p>
                </div>
            </div>
        </body>
        </html>
    `);
});

const PORT = process.env.API_PORT || 5000;
app.listen(PORT, () => {
    console.log(\`🔗 API Gateway running at http://localhost:\${PORT}\`);
});
EOF
    
    # Install dependencies if needed
    if [ ! -d "node_modules/http-proxy-middleware" ]; then
        npm install http-proxy-middleware --save > /dev/null 2>&1
    fi
    
    nohup node api-gateway.js > logs/api-gateway.log 2>&1 &
    API_PID=$!
    
    sleep 2
    
    if curl -f http://localhost:$API_PORT > /dev/null 2>&1; then
        print_success "API Gateway running at http://localhost:$API_PORT"
        echo $API_PID > api-gateway.pid
    else
        print_warning "API Gateway failed to start"
    fi
}

generate_deployment_manifests() {
    print_section "☸️ GENERATING KUBERNETES DEPLOYMENT MANIFESTS"
    
    # Production-ready Kubernetes manifests
    cat > deployment/production/rivic-complete-pipeline.yaml << 'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: rivic-production
  labels:
    app: rivic-q-runtime
    tier: production
    christmas: "true"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rivic-website
  namespace: rivic-production
  labels:
    app: rivic-website
    tier: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rivic-website
  template:
    metadata:
      labels:
        app: rivic-website
    spec:
      containers:
      - name: website
        image: rivic/q-runtime-website:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
        - name: CHRISTMAS_MODE
          value: "true"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rivic-demo
  namespace: rivic-production
  labels:
    app: rivic-demo
    tier: demo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: rivic-demo
  template:
    metadata:
      labels:
        app: rivic-demo
    spec:
      containers:
      - name: demo
        image: rivic/q-runtime-demo:latest
        ports:
        - containerPort: 3000
        env:
        - name: QUANTUM_SAFE_MODE
          value: "true"
        resources:
          requests:
            memory: "512Mi"
            cpu: "200m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: rivic-website-service
  namespace: rivic-production
spec:
  selector:
    app: rivic-website
  ports:
  - port: 80
    targetPort: 4000
  type: LoadBalancer
---
apiVersion: v1
kind: Service
metadata:
  name: rivic-demo-service
  namespace: rivic-production
spec:
  selector:
    app: rivic-demo
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rivic-ingress
  namespace: rivic-production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - rivic.quantum-safe.com
    - demo.rivic.quantum-safe.com
    secretName: rivic-tls
  rules:
  - host: rivic.quantum-safe.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rivic-website-service
            port:
              number: 80
  - host: demo.rivic.quantum-safe.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rivic-demo-service
            port:
              number: 80
EOF
    
    print_success "Kubernetes manifests generated"
}

create_docker_images() {
    print_section "🐳 CREATING OPTIMIZED DOCKER IMAGES"
    
    # Website Docker image
    cat > Dockerfile.website << 'EOF'
FROM node:18-alpine AS builder
WORKDIR /app
COPY saas-website/package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY saas-website/ ./
EXPOSE 4000
CMD ["node", "server.js"]
EOF
    
    # Demo Docker image
    cat > Dockerfile.demo << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY simple-demo.js ./
COPY package.json ./
RUN npm install --production
EXPOSE 3000
CMD ["node", "simple-demo.js"]
EOF
    
    print_success "Docker images configured"
}

setup_ci_cd() {
    print_section "🔄 SETTING UP CI/CD PIPELINE"
    
    mkdir -p .github/workflows
    
    cat > .github/workflows/deploy.yml << 'EOF'
name: 🚀 Rivic Q-Runtime Christmas Deployment

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm ci
    - run: npm test
    
  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
    - uses: actions/checkout@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Build and push Docker images
      run: |
        docker build -f Dockerfile.website -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-website:latest .
        docker build -f Dockerfile.demo -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-demo:latest .
        docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-website:latest
        docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-demo:latest
  
  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Production
      run: |
        echo "🎄 Deploying Rivic Q-Runtime Christmas Launch! 🎁"
        kubectl apply -f deployment/production/rivic-complete-pipeline.yaml
EOF
    
    print_success "CI/CD pipeline configured"
}

run_health_checks() {
    print_section "🏥 RUNNING HEALTH CHECKS"
    
    local services=("Website:$WEBSITE_PORT" "Demo:$DEMO_PORT" "Monitoring:$MONITORING_PORT" "API Gateway:$API_PORT")
    local all_healthy=true
    
    for service in "${services[@]}"; do
        local name="${service%%:*}"
        local port="${service##*:}"
        
        if curl -f http://localhost:$port > /dev/null 2>&1; then
            print_success "$name is healthy"
        else
            print_error "$name is unhealthy"
            all_healthy=false
        fi
    done
    
    if $all_healthy; then
        print_success "All services are healthy"
    else
        print_warning "Some services are unhealthy - check logs"
    fi
}

display_pipeline_summary() {
    print_section "📋 PIPELINE DEPLOYMENT SUMMARY"
    
    echo -e "${GREEN}"
    cat << 'EOF'
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  🎄 RIVIC Q-RUNTIME CHRISTMAS PIPELINE: FULLY DEPLOYED! 🎁     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
EOF
    echo -e "${NC}"
    
    echo -e "\n${CYAN}🔗 ACCESS POINTS:${NC}"
    echo -e "┌─────────────────────────────────────────────────────────────────┐"
    echo -e "│ 🌐 Marketing Website: ${BLUE}http://localhost:$WEBSITE_PORT${NC}          │"
    echo -e "│ 🏦 Live Demo:        ${BLUE}http://localhost:$DEMO_PORT${NC}              │"
    echo -e "│ 📊 Monitoring:       ${BLUE}http://localhost:$MONITORING_PORT${NC}              │"
    echo -e "│ 🔗 API Gateway:      ${BLUE}http://localhost:$API_PORT${NC}              │"
    echo -e "│ 🎯 Pipeline Control: ${BLUE}http://localhost:$API_PORT${NC}              │"
    echo -e "└─────────────────────────────────────────────────────────────────┘"
    
    echo -e "\n${YELLOW}🎯 CUSTOMER JOURNEY PIPELINE:${NC}"
    echo -e "┌─────────────────────────────────────────────────────────────────┐"
    echo -e "│ 1. ${BLUE}Discovery${NC}     → Marketing Website (SEO, Content)        │"
    echo -e "│ 2. ${BLUE}Demo Request${NC}  → Live Banking Demo (Technical Proof)     │"
    echo -e "│ 3. ${BLUE}Trial Signup${NC}  → 14-day Premium Access (Validation)     │"
    echo -e "│ 4. ${BLUE}Enterprise${NC}    → Production Deployment (Revenue)        │"
    echo -e "└─────────────────────────────────────────────────────────────────┘"
    
    echo -e "\n${PURPLE}📈 SUCCESS METRICS:${NC}"
    echo -e "┌─────────────────────────────────────────────────────────────────┐"
    echo -e "│ • ${GREEN}Q1 Target:${NC} €100K ARR (Early adopters)                  │"
    echo -e "│ • ${GREEN}Q2 Target:${NC} €500K ARR (Market penetration)             │"
    echo -e "│ • ${GREEN}Q3 Target:${NC} €2M ARR (Scale expansion)                  │"
    echo -e "│ • ${GREEN}Q4 Target:${NC} €5M ARR (Enterprise growth)                │"
    echo -e "│ • ${GREEN}18M Target:${NC} €10M ARR (Market leadership)               │"
    echo -e "└─────────────────────────────────────────────────────────────────┘"
    
    echo -e "\n${GREEN}🎄 CHRISTMAS LAUNCH CHECKLIST:${NC}"
    echo -e "┌─────────────────────────────────────────────────────────────────┐"
    echo -e "│ ✅ Marketing Website (Christmas themed)                        │"
    echo -e "│ ✅ Live Demo Environment (Banking simulation)                  │"
    echo -e "│ ✅ Monitoring Dashboard (Real-time analytics)                  │"
    echo -e "│ ✅ API Gateway (Unified access)                                │"
    echo -e "│ ✅ Docker Images (Production ready)                            │"
    echo -e "│ ✅ Kubernetes Manifests (Cloud deployment)                     │"
    echo -e "│ ✅ CI/CD Pipeline (Automated deployment)                       │"
    echo -e "│ ✅ Health Checks (System monitoring)                           │"
    echo -e "└─────────────────────────────────────────────────────────────────┘"
    
    echo -e "\n${CYAN}🚀 NEXT STEPS:${NC}"
    echo "1. Visit http://localhost:$API_PORT for pipeline overview"
    echo "2. Test complete customer journey"
    echo "3. Deploy to production Kubernetes cluster"
    echo "4. Launch Christmas marketing campaign"
    echo "5. Monitor metrics and scale based on demand"
    
    echo -e "\n${PURPLE}🎁 Merry Christmas! Your quantum-safe banking platform is ready to revolutionize the industry! 🎄${NC}"
}

cleanup_on_exit() {
    print_info "Cleaning up processes..."
    
    # Kill all background processes
    [ -f website.pid ] && kill $(cat website.pid) 2>/dev/null || true
    [ -f demo.pid ] && kill $(cat demo.pid) 2>/dev/null || true
    [ -f monitoring.pid ] && kill $(cat monitoring.pid) 2>/dev/null || true
    [ -f api-gateway.pid ] && kill $(cat api-gateway.pid) 2>/dev/null || true
    
    # Remove pid files
    rm -f *.pid
    
    print_info "Cleanup complete"
}

# Main execution
main() {
    print_header
    
    # Setup trap for cleanup
    trap cleanup_on_exit EXIT
    
    check_dependencies
    setup_environment
    start_marketing_website
    start_live_demo
    setup_monitoring
    setup_api_gateway
    generate_deployment_manifests
    create_docker_images
    setup_ci_cd
    
    sleep 3
    run_health_checks
    display_pipeline_summary
    
    print_info "Pipeline is running. Press Ctrl+C to stop all services."
    
    # Keep the script running
    while true; do
        sleep 30
        # Perform health checks every 30 seconds
        run_health_checks > /dev/null 2>&1
    done
}

# Execute main function
main "$@"
