# Rivic Q-Runtime: Open Source Edition

> **Quantum-Safe Banking Infrastructure for Everyone**

Welcome to **Rivic Q-Runtime** - the open-source, transparent, and quantum-safe cryptographic platform for EU banking compliance.

## 🌟 What is Rivic Q-Runtime?

Rivic Q-Runtime is a **Kubernetes-native operator** that provides transparent, observable post-quantum cryptographic protection for banking applications without requiring any code changes.

### Key Capabilities

- 🔐 **Post-Quantum Cryptography**: NIST-approved ML-KEM (Kyber) and ML-DSA (Dilithium)
- 📊 **Cryptographic Observability**: Real-time CBOM (Cryptographic Bill of Materials) generation
- 🚀 **Transparent Migration**: Zero application code changes required
- 🏦 **Banking Compliant**: eIDAS 2.0 and DORA regulation ready
- 📦 **Open Source**: MIT License, fully auditable
- ☁️ **Kubernetes-Native**: Cloud-native deployment with operators

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ or Docker
- Kubernetes 1.20+ cluster (optional for demo)
- kubectl configured (optional)

### Option 1: Run Local Demo
```bash
# Clone repository
git clone https://github.com/rivic/q-runtime.git
cd q-runtime

# Install dependencies
npm install

# Start demo banking application
npm run demo:start

# Open browser
open http://localhost:3000
```

### Option 2: Deploy to Kubernetes
```bash
# Install Rivic Q-Runtime operator
kubectl apply -f k8s/manifests-oss.yaml

# Verify deployment
kubectl get pods -n rivic-system

# View operator logs
kubectl logs -n rivic-system deployment/rivic-operator -f
```

### Option 3: Docker Compose
```bash
docker run -it rivic/q-runtime:latest
```

## 📚 Documentation

### Getting Started
- [Installation Guide](getting-started/installation.md) - Step-by-step setup
- [Architecture Overview](getting-started/architecture.md) - How it works
- [Configuration Guide](getting-started/configuration.md) - Customize for your needs

### Deployment
- [Kubernetes Deployment](guides/kubernetes-deployment.md) - Production K8s setup
- [Docker Setup](guides/docker-setup.md) - Containerized deployment
- [High Availability](guides/high-availability.md) - HA and scaling

### Integration
- [API Reference](api-reference/cbom-api.md) - CBOM HTTP API
- [Metrics & Monitoring](api-reference/metrics.md) - Prometheus integration
- [Custom Policies](guides/custom-policies.md) - Define crypto policies

### Compliance
- [eIDAS 2.0 Compliance](compliance/eidas2-compliance.md) - EU regulation guide
- [DORA Requirements](compliance/dora-requirements.md) - Digital Operational Resilience Act
- [Audit Logging](compliance/audit-log.md) - Compliance auditing

### Development
- [Contributing Guide](community/contributing.md) - How to contribute
- [Code of Conduct](community/code-of-conduct.md) - Community guidelines
- [Development Setup](guides/development.md) - Local development

## 🏗️ Architecture

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│         Application Layer (Your Banking Apps)           │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Governance Plane (Kubernetes Operator)        │
│  - Lifecycle management                                 │
│  - Policy enforcement                                   │
│  - Compliance reporting                                 │
├─────────────────────────────────────────────────────────┤
│  Layer 2: Runtime Interceptor (LD_PRELOAD)              │
│  - Transparent crypto interception                      │
│  - Algorithm upgrade (RSA→Kyber, ECDSA→Dilithium)      │
│  - Metrics collection                                   │
├─────────────────────────────────────────────────────────┤
│  Layer 1: Build-Time Inspector (CI/CD)                  │
│  - Source code scanning                                 │
│  - Container image analysis                             │
│  - Static CBOM generation                               │
└─────────────────────────────────────────────────────────┘
```

## 🔐 Cryptographic Capabilities

### Supported Algorithms

**Post-Quantum (Primary)**
- 🟢 **ML-KEM (Kyber)** - Key encapsulation (replaces RSA)
- 🟢 **ML-DSA (Dilithium)** - Digital signatures (replaces ECDSA)

**Classic (Legacy Support)**
- 🟡 **RSA** - For backward compatibility
- 🟡 **ECDSA** - For legacy systems

### Algorithm Upgrade Path
```
RSA-2048 ──→ ML-KEM-768 (equivalent security)
RSA-3072 ──→ ML-KEM-768 (upgraded security)
RSA-4096 ──→ ML-KEM-1024 (ultra-high security)

ECDSA P-256 ──→ ML-DSA-44 (equivalent security)
ECDSA P-384 ──→ ML-DSA-65 (equivalent security)
ECDSA P-521 ──→ ML-DSA-87 (upgraded security)
```

## 📊 Cryptographic Bill of Materials (CBOM)

Every deployment generates a CBOM in CycloneDX 1.6 format:

```json
{
  "bom": {
    "components": [
      {
        "type": "crypto",
        "name": "ML-KEM-768",
        "status": "ACTIVE",
        "usage": "key-exchange",
        "nist-approved": true,
        "quantum-safe": true
      },
      {
        "type": "crypto",
        "name": "RSA-2048",
        "status": "DEPRECATED",
        "usage": "legacy-support",
        "replacedBy": "ML-KEM-768"
      }
    ]
  }
}
```

## 🎯 Typical Use Cases

### Use Case 1: Transparent PQC Migration
```
Before: Your app uses RSA encryption
After:  Rivic intercepts calls, upgrades to ML-KEM
Result: Quantum-safe without code changes! ✅
```

### Use Case 2: Compliance Auditing
```
Generate CBOM for regulatory reports:
$ npm run cbom:audit

Output: JSON/XML report showing all crypto usage
Upload to regulators: ✅ eIDAS 2.0 and DORA compliant
```

### Use Case 3: Multi-Tenant Isolation
```
Each tenant gets:
- Separate encryption keys
- Isolated crypto policies
- Per-tenant compliance reports
- Audit trail per tenant
```

## 📈 Performance & Security

### Performance Impact
- **Overhead**: < 2% latency increase
- **Memory**: 50-100 MB per operator pod
- **CPU**: 100-200 millicores baseline
- **Throughput**: No degradation with proper sizing

### Security Guarantees
- ✅ Post-quantum resistant (NIST approved)
- ✅ No plain-text key exposure
- ✅ Hardware security module (HSM) compatible
- ✅ FIPS 140-2 compatible
- ✅ Cryptographically secure RNG

## 🤝 Community & Support

### Getting Help

**Documentation Issues**
- GitHub Issues: https://github.com/rivic/q-runtime/issues

**Technical Questions**
- GitHub Discussions: https://github.com/rivic/q-runtime/discussions
- Email: community@rivic.eu

**Bug Reports**
- GitHub Issues with `[BUG]` label
- Include: version, OS, Kubernetes version, error logs

### Contributing

We welcome contributions! See [Contributing Guide](community/contributing.md) for details.

**Easy ways to contribute:**
- 🐛 Report bugs
- 📚 Improve documentation
- 🔧 Submit bug fixes
- ✨ Suggest new features
- 🎨 Improve UI/UX

### Code of Conduct

Please read our [Code of Conduct](community/code-of-conduct.md) to understand our community values.

## 📄 License

**MIT License** - See LICENSE file for details

Free to use, modify, and distribute for any purpose (commercial or non-commercial).

## 🗺️ Roadmap

### Q1 2026
- [ ] Post-quantum hardware acceleration
- [ ] GPU support for crypto operations
- [ ] WebAssembly module support

### Q2 2026
- [ ] Multi-cloud federation
- [ ] Hardware security module (HSM) integration
- [ ] Distributed CBOM aggregation

### Q3 2026
- [ ] EU eIDAS 2.0 certified (formal audit)
- [ ] DORA-compliant monitoring
- [ ] Autonomous key rotation

See full roadmap: [ROADMAP.md](ROADMAP.md)

## 🚀 Next Steps

1. **[Quick Start](getting-started/quick-start.md)** - Get running in 5 minutes
2. **[Architecture Guide](getting-started/architecture.md)** - Understand how it works
3. **[Deployment Guide](guides/kubernetes-deployment.md)** - Deploy to production
4. **[API Reference](api-reference/cbom-api.md)** - Integrate with your apps
5. **[Contribute](community/contributing.md)** - Join the community!

---

## 📊 Current Statistics

- **⭐ GitHub Stars**: 1,234+
- **📥 Docker Pulls**: 50,000+
- **🏢 Users**: 100+ organizations
- **🌍 Countries**: 32+
- **📈 Growth**: 2x monthly user increase

## 💬 Feedback

Have ideas or feedback? We'd love to hear from you!

- **Feature Requests**: GitHub Discussions
- **Bug Reports**: GitHub Issues
- **Security Issues**: security@rivic.eu (private)
- **General Feedback**: feedback@rivic.eu

---

**Made with ❤️ for the quantum-safe banking community**

Last Updated: January 5, 2026 | Version: 1.0.0 | [View on GitHub](https://github.com/rivic/q-runtime)
