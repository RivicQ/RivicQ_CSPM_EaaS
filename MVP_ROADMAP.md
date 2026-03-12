# CryptoBOM SaaS – MVP Roadmap

## 🚀 **Current State: Enterprise MVP – Beta-Ready (v1.0.0-beta1)**

> As of March 2026 the Enterprise MVP is feature-complete and open for beta testing.
> The sections below document what is included in the beta, what is planned for GA,
> and what is on the post-GA roadmap.

---

## ✅ Beta Features (v1.0.0-beta1 – Available Now)

### Core Platform
- ✅ **CBOM scanning end-to-end** – `POST /api/v1/scans`, `GET /api/v1/scans/{id}`, `GET /api/v1/assets/{id}/bom`
- ✅ **Headleap CLI** – `scripts/scan-cbom.sh` for developer CBOM flow
- ✅ **Algorithm inventory** – RSA, AES, ECDSA, ECC, 30+ algorithms with key-size validation
- ✅ **Quantum risk scoring** – Shor's/Grover's vulnerability flags per algorithm
- ✅ **PQC migration planning** – NIST FIPS 203/204/205 (ML-KEM, ML-DSA, SLH-DSA) roadmaps
- ✅ **JWT authentication** with RBAC (admin/operator/analyst/viewer)
- ✅ **Multi-tenant** – Organisation isolation, audit logs
- ✅ **Full React frontend** – Dashboard, Assets, Scanner, Analytics, Settings, all Enterprise pages

### Enterprise (Beta Access)
- ✅ **Multi-cloud HSM inventory** – AWS CloudHSM, IBM HPCS, GCP KMS
- ✅ **IBM Quantum attestation** – Hardware-backed risk scoring (requires API key)
- ✅ **Compliance reports** – DORA Article 9, BSI TR-02102-1, eIDAS 2.0, NIST PQC
- ✅ **eBPF live scanning** – Cilium-based real-time network crypto analysis
- ✅ **Kubernetes operator** – `CbomReport` CRD for scheduled in-cluster CBOM generation
- ✅ **GCP deployment** – Terraform + GKE + Cloud SQL + Cloud Armor WAF
- ✅ **CI/CD** – CodeQL, Trivy, gosec, SBOM generation, dependency review

---

## 🗓 GA Features (Planned – Q3 2026)

- 🔄 **SOC 2 Type II** certification
- 🔄 **ISO 27001** certification
- 🔄 **Multi-region HA** deployment (GCP multi-region + AWS failover)
- 🔄 **Production SLAs** – 99.9 % uptime, 4-hour support response
- 🔄 **Advanced ML threat detection** – Anomalous cryptography behaviour detection
- 🔄 **SBOM ↔ CBOM correlation** – Cross-reference software components with crypto usage
- 🔄 **Enterprise SSO GA** – SAML 2.0 / LDAP (Beta: available on request)
- 🔄 **Custom compliance frameworks** – Customer-defined rule sets

---

## 🔮 Post-GA Roadmap

- 📅 **Hardware attestation** – TPM 2.0 and Intel SGX integration
- 📅 **SBOM ingestion** – Accept CycloneDX / SPDX SBOMs and overlay crypto findings
- 📅 **GitHub / GitLab integration** – Automatic CBOM on every PR
- 📅 **IDE plugin** – VS Code extension for inline crypto risk feedback
- 📅 **Quantum-safe TLS enforcement** – Automated policy enforcement via Kubernetes admission
- 📅 **FedRAMP High** authorisation

---

## Historical Prototype Gaps (all resolved in beta)


### 1. **Real Database Implementation** 
**Current**: Mock database (`db := &database.DB{}`)
**Needed**: 
```go
// Replace mock with real connection
db, err := database.NewConnection(cfg.Database)
if err != nil {
    log.Fatal("Failed to connect to database:", err)
}
if err := database.RunMigrations(db, "migrations"); err != nil {
    log.Fatal("Failed to run migrations:", err)
}
```

**Missing**:
- Database query methods for all entities
- Connection pooling configuration
- Health check with database connectivity
- Data access layer for CBOM, assets, attestations

### 2. **Authentication & Authorization**
**Current**: No auth system
**Needed**:
- JWT token generation/validation
- User registration/login endpoints
- Role-based access control (RBAC)
- Multi-tenancy support
- API key management

### 3. **Complete API Implementation**
**Current**: Demo data returns only
**Needed**:
```bash
# Replace all mock responses with real database operations
POST /api/v1/cbom           -> Create CBOM in database
GET /api/v1/assets           -> Query real crypto assets  
POST /api/v1/ibmq/attest     -> Real IBMQ API calls
```

### 4. **Comprehensive Testing**
**Current**: Zero test files
**Needed**:
- Unit tests for all handlers
- Integration tests for API endpoints
- Database migration tests
- IBM Quantum client tests
- End-to-end test suite

---

## 🚀 **MEDIUM PRIORITY - Production Readiness**

### 5. **Error Handling & Logging**
**Current**: Basic logging, no structured errors
**Needed**:
- Consistent error response format
- Request ID tracing
- Structured logging with correlation
- Graceful error responses
- Circuit breakers for external APIs

### 6. **Security Hardening**
**Current**: Open APIs, no security
**Needed**:
- Input validation and sanitization
- Rate limiting per tenant
- CORS configuration
- SQL injection prevention
- Secrets management
- TLS/HTTPS enforcement

### 7. **Monitoring & Observability**
**Current**: Basic health check
**Needed**:
- Prometheus metrics endpoints
- OpenTelemetry tracing
- Application performance monitoring
- Error tracking (Sentry)
- Log aggregation (ELK stack)

### 8. **Frontend Enhancements**
**Current**: Single HTML demo file
**Needed**:
- Real-time data updates
- Error handling in UI
- Authentication flow
- Responsive design
- WebSocket integration

---

## 🛠️ **IMPLEMENTATION PLAN - 4 Sprints**

### **Sprint 1: Core Foundation (Week 1-2)**
```bash
# Priority 1: Real Database
- Implement database query methods
- Replace mock DB with real connections  
- Add database health checks
- Implement data access layer

# Priority 2: Basic Auth
- JWT authentication system
- User registration/login
- Basic RBAC
- Protect existing endpoints
```

### **Sprint 2: Production APIs (Week 3-4)**
```bash
# Priority 3: Complete API Implementation  
- Replace all demo data with real DB operations
- Implement IBM Quantum real API integration
- Add input validation
- Standardize error responses

# Priority 4: Testing Framework
- Unit test setup
- API endpoint tests
- Database tests
- CI/CD pipeline
```

### **Sprint 3: Security & Monitoring (Week 5-6)**
```bash
# Priority 5: Security Hardening
- Input validation & sanitization
- Rate limiting
- CORS configuration
- Secrets management
- Security headers

# Priority 6: Observability
- Prometheus metrics
- Structured logging
- Request tracing
- Error tracking
```

### **Sprint 4: Polish & Production (Week 7-8)**
```bash
# Priority 7: Frontend Enhancement
- Authentication in UI
- Real-time updates
- Error handling
- Mobile responsiveness

# Priority 8: Deployment Automation
- Production-ready Docker images
- Kubernetes manifests
- CI/CD for both editions
- Monitoring stack deployment
```

---

## 📋 **MVP DEFINITION**

### **OSS MVP Features** ✅
- [ ] User authentication & CBOM management
- [ ] Real cryptographic asset discovery  
- [ ] Database persistence of CBOM data
- [ ] Basic vulnerability detection
- [ ] Kubernetes integration
- [ ] API documentation
- [ ] Testing coverage >80%

### **Enterprise MVP Features** 🚀
- [ ] All OSS features +
- [ ] Real IBM Quantum Network integration
- [ ] Multi-tenant support
- [ ] Advanced threat detection
- [ ] SSO integration
- [ ] Production deployment automation
- [ ] 99.9% SLA monitoring

---

## 🚨 **IMMEDIATE ACTIONS - This Week**

### **Day 1-2: Database Implementation**
```bash
# 1. Fix database initialization
cd internal/database/
# Implement actual query methods for all entities
# Test database connections and migrations

# 2. Update server initialization
cd cmd/server/oss/main.go
# Replace mock with real database connection
# Add database health check endpoint
```

### **Day 3-4: Authentication System**  
```bash
# 1. Create auth package
mkdir internal/auth/
# Implement JWT generation/validation

# 2. Add user management
mkdir internal/models/
# Implement user, tenant models

# 3. Protect endpoints
# Add middleware for authentication
# Update API routes with auth requirements
```

### **Day 5-7: API Implementation**
```bash
# 1. Replace all demo data returns
# Implement real database operations
# Add input validation

# 2. IBM Quantum Integration  
# Test real IBMQ API calls
# Implement error handling for external APIs
```

---

## 📊 **PROGRESS TRACKING**

### **Current MVP Readiness: 25%**
```
✅ Architecture & Design        [100%]
✅ Build System                 [90%] 
✅ API Structure               [80%]
🔴 Database Implementation     [5%]
🔴 Authentication              [0%]
🔴 Testing Coverage           [0%]
🔴 Security Hardening         [10%]
🔴 Monitoring                [5%]
```

### **MVP Launch Timeline**
```
Week 1-2: Core Foundation     ████████████████████░░░░ 50%
Week 3-4: Production APIs     ░░░░░░░░░░░░░░░░░░░░ 0%
Week 5-6: Security & Obs     ░░░░░░░░░░░░░░░░░░░░ 0%  
Week 7-8: Production Ready    ░░░░░░░░░░░░░░░░░░░░ 0%
```

---

## 🎯 **SUCCESS METRICS FOR MVP**

### **Technical Metrics**
- [ ] Database queries: <100ms (95th percentile)
- [ ] API response time: <200ms (95th percentile)  
- [ ] Uptime: >99.5% for OSS
- [ ] Test coverage: >80%
- [ ] Security scan: 0 critical vulnerabilities

### **Business Metrics** 
- [ ] User onboarding: <3 minutes
- [ ] CBOM generation: <30 seconds
- [ ] Asset discovery: Real-time
- [ ] Mobile responsiveness: 100%
- [ ] Documentation completeness: 100%

---

## 🚀 **READY FOR MVP?**

### **Blockers to Resolve:**
1. **Real database integration** (Critical)
2. **User authentication** (Critical)
3. **Complete API implementation** (Critical)
4. **Testing framework** (Critical)
5. **Security hardening** (High)
6. **IBMQ real integration** (High for Enterprise)

### **Estimated Timeline: 6-8 weeks**
With focused development and proper prioritization, MVP can be achieved within **2 months**.

**Next Step**: Begin Sprint 1 with database implementation and authentication system.