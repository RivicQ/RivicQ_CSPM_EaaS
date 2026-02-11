# CryptoBOM SaaS - Clear Separation: OSS vs Enterprise

## 🎯 Overview
CryptoBOM SaaS is now clearly divided into two distinct editions with completely separate codebases, APIs, and deployment strategies.

---

## 🔓 Open Source Edition (OSS)

### 📍 Location
- **Code**: `cmd/server/oss/main.go`
- **API**: `internal/api/oss/`
- **Port**: `8080`
- **Binary**: `bin/cryptobom-oss`

### ✨ Core Features
- **eBPF-based cryptographic asset discovery**
- **Basic CBOM management & tracking**
- **Vulnerability detection & reporting**
- **Kubernetes integration**
- **Real-time monitoring dashboard**
- **Cilium network policy integration**
- **Prometheus/Grafana monitoring**

### 🚀 API Endpoints
```
http://localhost:8080/api/v1/
├── cbom/           # CBOM management
├── assets/         # Crypto asset discovery
├── security/       # Basic security monitoring
├── kubernetes/     # K8s integration
├── monitoring/     # Observability tools
├── cilium/        # Cilium integration
└── dashboard/     # OSS analytics
```

### 📊 Demo Data
- Basic cryptographic assets (RSA-2048, AES-256, ECDSA)
- Simple vulnerability detection
- Standard compliance scoring
- No quantum capabilities

---

## 🔒 Enterprise Edition

### 📍 Location
- **Code**: `cmd/server/enterprise/main.go`
- **API**: `internal/api/enterprise/`
- **Port**: `9090`
- **Binary**: `bin/cryptobom-enterprise`

### ✨ Enhanced Features (All OSS +)
- **IBM Quantum Network Integration** ⚛️
- **Post-quantum algorithm attestation**
- **Advanced ML-powered threat detection**
- **Multi-cloud deployment support**
- **Enterprise SSO (SAML/LDAP/OAuth)**
- **Advanced analytics & forecasting**
- **Real-time quantum vulnerability assessment**
- **Premium support & SLA**

### 🚀 API Endpoints
```
http://localhost:9090/api/v1/
├── cbom/           # Enhanced CBOM with IBMQ attestation
├── assets/         # Assets with quantum verification
├── security/       # ML-powered security analysis
├── kubernetes/     # Enhanced K8s + quantum scanning
├── monitoring/     # Enterprise observability
├── cloud/          # Multi-cloud integration
├── sso/            # Enterprise authentication
├── analytics/      # Advanced ML insights
├── ibmq/           # ⚛️ IBM Quantum Network API
└── dashboard/     # Enterprise analytics
```

### ⚛️ IBM Quantum Integration
```bash
# IBMQ-specific endpoints
GET /api/v1/ibmq/status           # Connection status
GET /api/v1/ibmq/systems          # Available quantum systems
POST /api/v1/ibmq/attest          # Create quantum attestation
GET /api/v1/ibmq/networks         # Quantum network info
POST /api/v1/ibmq/emergency       # Emergency quantum response
```

### 📊 Enhanced Demo Data
- **Post-quantum algorithms** (CRYSTALS-Kyber, CRYSTALS-Dilithium)
- **IBM Quantum-attested assets**
- **ML threat intelligence**
- **Quantum vulnerability forecasts**
- **Enterprise compliance metrics**

---

## 🔧 Build & Deployment System

### 📦 Build Commands
```bash
# Build OSS edition
./build.sh oss
./build.sh oss v1.0.0

# Build Enterprise edition  
./build.sh enterprise
./build.sh enterprise v2.0.0

# Edition-aware runner
./run-edition.sh oss start
./run-edition.sh enterprise start
./run-edition.sh status
./run-edition.sh stop
```

### 🐳 Docker Differences
```dockerfile
# OSS Dockerfile
FROM alpine:latest
COPY bin/cryptobom-oss /app/cryptobom-server
EXPOSE 8080

# Enterprise Dockerfile
FROM alpine:latest  
COPY bin/cryptobom-enterprise /app/cryptobom-enterprise
COPY configs/enterprise.yaml /app/config.yaml
EXPOSE 9090
```

### ☸️ Kubernetes Differences
```yaml
# OSS Deployment
metadata:
  name: cryptobom-oss
  namespace: cryptobom-oss
  labels:
    edition: "oss"
spec:
  replicas: 1
  containerPort: 8080

# Enterprise Deployment  
metadata:
  name: cryptobom-enterprise
  namespace: cryptobom-enterprise
  labels:
    edition: "enterprise"
    ibmq-enabled: "true"
spec:
  replicas: 2
  containerPort: 9090
  resources:
    limits:
      cpu: "1000m"
      memory: "2Gi"
```

---

## ⚛️ IBM Quantum Integration - Enterprise Only

### 🔗 Real API Integration
```go
// IBM Quantum Client for Enterprise
client := quantum.NewIBMQuantumClient(quantum.IBMQuantumConfig{
    APIKey:    os.Getenv("IBMQ_API_KEY"),
    BaseURL:   "https://api.quantum-computing.ibm.com",
    Network:   "ibm-q",
    EnableTLS: true,
})

// Perform quantum attestation
attestation, err := client.AttestAlgorithm(ctx, quantum.QuantumAttestationRequest{
    Algorithm:       "RSA-2048",
    KeySize:         2048,
    Usage:          "tls_certificate",
    AttestationType: "quantum_safety_validation",
})
```

### 📊 Real-Time Quantum Data
- **Live IBM Quantum Network status**
- **Available quantum systems & qubits**
- **Quantum volume metrics**
- **Network fidelity measurements**
- **Emergency quantum threat response**

### 🔐 Quantum Attestation Workflow
1. **Asset Discovery** → Identify cryptographic assets
2. **IBMQ Verification** → Send to IBM Quantum Network
3. **Quantum Analysis** → Analyze quantum vulnerability
4. **Attestation** → Generate quantum-verified certificate
5. **Monitoring** → Continuous quantum safety monitoring

---

## 🚀 Quick Start Commands

### OSS Edition
```bash
# Start Open Source edition
./run-edition.sh oss start

# Access OSS dashboard
# http://localhost:8080
# file:///home/re1/cryptobom-saas/web/demo-dashboard.html

# Test OSS endpoints
curl http://localhost:8080/healthz
curl http://localhost:8080/api/v1/metrics/overview
```

### Enterprise Edition
```bash
# Start Enterprise edition
./run-edition.sh enterprise start

# Access Enterprise dashboard  
# http://localhost:9090
# file:///home/re1/cryptobom-saas/web/demo-dashboard.html

# Test Enterprise endpoints
curl http://localhost:9090/healthz
curl http://localhost:9090/api/v1/ibmq/status
curl http://localhost:9090/api/v1/ibmq/systems
```

---

## 📊 Feature Comparison Matrix

| Feature | OSS | Enterprise |
|---------|-----|------------|
| **Basic CBOM Management** | ✅ | ✅ |
| **eBPF Asset Discovery** | ✅ | ✅ |
| **Vulnerability Detection** | ✅ | ✅ |
| **Kubernetes Integration** | ✅ | ✅ |
| **IBM Quantum Integration** | ❌ | ✅ |
| **Post-Quantum Attestation** | ❌ | ✅ |
| **ML Threat Detection** | ❌ | ✅ |
| **Multi-Cloud Support** | ❌ | ✅ |
| **Enterprise SSO** | ❌ | ✅ |
| **Advanced Analytics** | ❌ | ✅ |
| **Quantum Forecasts** | ❌ | ✅ |
| **Premium Support** | ❌ | ✅ |
| **API Rate Limits** | 100/hr | 1000/hr |
| **Deployment Port** | 8080 | 9090 |
| **Binary Name** | `cryptobom-oss` | `cryptobom-enterprise` |

---

## 🔒 Security & Compliance

### OSS Security
- Basic JWT authentication
- Local database storage
- Standard HTTPS/TLS
- Basic audit logging

### Enterprise Security  
- Advanced JWT with enterprise claims
- PostgreSQL with encryption
- Mutual TLS (mTLS)
- IBM Quantum-verified cryptographic signatures
- Enterprise audit trails
- SSO integration (SAML/LDAP)
- Advanced RBAC

---

## 📈 Scaling & Performance

### OSS Scaling
- Single instance deployment
- SQLite/PostgreSQL
- Basic load balancing
- Community support

### Enterprise Scaling
- Multi-instance HA deployment
- PostgreSQL Enterprise with connection pooling
- Advanced load balancing & auto-scaling
- 24/7 enterprise support
- 99.9% SLA guarantee

---

## 🎯 Migration Path

### From OSS to Enterprise
1. **Backup OSS data** → Export CBOM database
2. **Deploy Enterprise** → Use enterprise deployment scripts  
3. **Import data** → Migrate CBOM data
4. **Enable IBMQ** → Configure IBM Quantum API key
5. **Enable features** → Activate ML, SSO, multi-cloud
6. **Verify attestation** → Run quantum attestation on all assets

### Example Migration Command
```bash
# 1. Stop OSS
./run-edition.sh oss stop

# 2. Build & start Enterprise
./build.sh enterprise
./run-edition.sh enterprise start

# 3. Import OSS CBOM data
curl -X POST http://localhost:9090/api/v1/migration/import \
  -H "Content-Type: application/json" \
  -d '{"source": "oss", "data": "..."}'

# 4. Run IBMQ attestation
curl -X POST http://localhost:9090/api/v1/ibmq/attest \
  -H "Content-Type: application/json" \
  -d '{"asset_id": "all", "immediate": true}'
```

---

This architecture ensures **clear separation** between OSS and Enterprise editions while allowing for seamless migration and feature parity where needed. The Enterprise edition provides **real IBM Quantum integration** directly through IBM's quantum network APIs, not just mock implementations.