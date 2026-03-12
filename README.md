# 🔐 CryptoBOM SaaS v1.0.0-beta1 – Enterprise Edition

> **🚀 Enterprise MVP is now feature-complete and open for beta client testing.**
> [Join the beta →](BETA_PROGRAM.md) · [5-minute CBOM quickstart →](QUICKSTART_CBOM.md)

## Badges

[![Stars](https://img.shields.io/github/stars/rivic-q/cryptobom-saas?style=social)](https://github.com/rivic-q/cryptobom-saas/stargazers)
[![Forks](https://img.shields.io/github/forks/rivic-q/cryptobom-saas?style=social)](https://github.com/rivic-q/cryptobom-saas/network)
[![Issues](https://img.shields.io/github/issues/rivic-q/cryptobom-saas)](https://github.com/rivic-q/cryptobom-saas/issues)
[![PRs](https://img.shields.io/github/issues-pr/rivic-q/cryptobom-saas)](https://github.com/rivic-q/cryptobom-saas/pulls)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/github/v/release/rivic-q/cryptobom-saas?include_prereleases&label=release)](https://github.com/rivic-q/cryptobom-saas/releases)
[![Go Version](https://img.shields.io/github/go-mod/go-version/rivic-q/cryptobom-saas)](https://golang.org/)
[![Release Date](https://img.shields.io/github/release-date/rivic-q/cryptobom-saas)](https://github.com/rivic-q/cryptobom-saas/releases)
[![Last Commit](https://img.shields.io/github/last-commit/rivic-q/cryptobom-saas)](https://github.com/rivic-q/cryptobom-saas/commits)
[![Contributors](https://img.shields.io/github/contributors/rivic-q/cryptobom-saas)](https://github.com/rivic-q/cryptobom-saas/graphs/contributors)
[![Code Size](https://img.shields.io/github/languages/code-size/rivic-q/cryptobom-saas)](https://github.com/rivic-q/cryptobom-saas)
[![Docker](https://img.shields.io/docker/pulls/rivicq/cryptobom-oss)](https://hub.docker.com/r/rivicq/cryptobom-oss)
[![Tests](https://img.shields.io/github/actions/workflow/status/rivic-q/cryptobom-saas/ci-oss.yml?label=CI)](https://github.com/rivic-q/cryptobom-saas/actions)
[![Pages](https://img.shields.io/github/actions/workflow/status/rivic-q/cryptobom-saas/deploy-pages.yml?label=Pages)](https://github.com/rivic-q/cryptobom-saas/actions/workflows/deploy-pages.yml)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-blue)](https://github.com/rivic-q/cryptobom-saas)
[![Language](https://img.shields.io/github/languages/top/rivic-q/cryptobom-saas)](https://github.com/rivic-q/cryptobom-saas)

---

## ⚡ Scan Your First CBOM in 5 Minutes

```bash
# 1. Clone and start the backend
git clone https://github.com/rivic-q/cryptobom-saas.git
cd cryptobom-saas
go run ./cmd/server/oss/main.go &

# 2. Run a CBOM scan (CLI headleap flow)
chmod +x scripts/scan-cbom.sh
./scripts/scan-cbom.sh ./myrepo --output cbom-report.json

# 3. Or trigger via REST API
curl -s -X POST http://localhost:8080/api/v1/scans \
  -H "Content-Type: application/json" \
  -d '{"target": "./myrepo", "scan_type": "cbom"}' | jq .
```

→ **Full quickstart guide:** [QUICKSTART_CBOM.md](QUICKSTART_CBOM.md)

---

## 🎬 Platform Animation

The animation below illustrates the CryptoBOM SaaS platform workflow — from cryptographic asset discovery through PQC compliance validation, IBM Quantum attestation, and final Cloud HSM vault storage.

### ▶ [Launch Animation on GitHub Pages](https://rivic-q.github.io/cryptobom-saas/)

> 🌐 **GitHub Pages (live site + animation):** [https://rivic-q.github.io/cryptobom-saas/](https://rivic-q.github.io/cryptobom-saas/)
> 
> 🎞️ **Direct animation link:** [https://rivic-q.github.io/cryptobom-saas/media/cryptobom-animation.html](https://rivic-q.github.io/cryptobom-saas/media/cryptobom-animation.html)

| Phase | Name                    | Duration | Key Visual                        |
|-------|-------------------------|----------|-----------------------------------|
| 1     | Inventory Discovery     | 0–2 s    | Radar pulse · asset highlighting  |
| 2     | PQC Compliance          | 2–4 s    | Checklist · red→green shields     |
| 3     | IBM Quantum Attestation | 4–6 s    | Q-logo pulse · certificate ribbon |
| 4     | Cloud HSM Vault Lock    | 6–8 s    | Data packets → vault seal         |

You can also open [`media/cryptobom-animation.html`](media/cryptobom-animation.html) locally in any modern browser — no build step required.

---

## ⚡ Quick Start (OSS)

```bash
# Clone, copy env template, start all services with Docker Compose
git clone https://github.com/rivic-q/cryptobom-saas.git
cd cryptobom-saas
cp .env.example .env          # edit JWT_SECRET before production use
docker compose up -d
curl http://localhost:8080/healthz
```

> **Full deployment guide →** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
> Covers local binary, Docker Compose, Kubernetes, CI/CD workflows, and all required secrets.

> **Preparing a live demo for a CISO or enterprise stakeholder? →** [DEMO_ENVIRONMENT.md](DEMO_ENVIRONMENT.md)
> Recommended environment, 10-minute demo script, and security posture summary.

## 🆓 Open Source Edition

[![CNCF](https://img.shields.io/badge/CNCF-Compliant-blue)](https://cncf.io)
[![DevSecOps](https://img.shields.io/badge/DevSecOps-Automated-green)](https://devsecops.org)
[![IBM Quantum](https://img.shields.io/badge/IBM%20Quantum-Enterprise-purple)](https://quantum-computing.ibm.com)
[![KIPU Q-CTRL](https://img.shields.io/badge/KIPU%20Q%2DCTRL-Advanced%20Control-orange)](https://q-ctrl.com)
[![Multi-Language](https://img.shields.io/badge/Multi%2DLanguage-Python%20%7C%20Java%20%7C%20Rust%20%7C%20C%2B%2B%20%7C%20C%20%7C%20Ruby-brightgreen)](https://github.com/rivic-q/cryptobom-saas)
[![Quantum-Safe](https://img.shields.io/badge/Quantum%2DSafe-NIST%20PQC-blue)](https://nist.gov/pqc/)

## 🏗️ RivicQ High-Level Architecture v1.3

### Core Engine Architecture
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                      RivicQ CryptoBOM Core Engine v1.3                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                           DevSecOps Integration Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  CI/CD Pipeline│  │   Automation   │  │  Monitoring     │                   │
│  │ • GitHub Actions│  │ • eBPF Tracing │  │ • Prometheus    │                   │
│  │ • GitLab CI     │  │ • Syscall Hook │  │ • Grafana       │                   │
│  │ • Jenkins       │  │ • API Hooks     │  │ • Jaeger        │                   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                           Quantum Computing Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  IBM Quantum   │  │  KIPU Q-CTRL   │  │  Mock Provider  │                   │
│  │ • Qiskit       │  │ • Quantum Ctrl │  │ • Simulated     │                   │
│  │ • 27 Qubits    │  │ • Error Correct│  │ • Deterministic │                   │
│  │ • 99.4% Fidelty│  │ • <1000 Qubits │  │ • Fast/Reliable │                   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                            Classical Engine Layer                           │
│  • Kubernetes Cluster Scanning  • Container Image Analysis                      │
│  • Code Repository Mining       • Network Traffic Analysis                      │
│  • eBPF System Call Hooking     • Algorithm Vulnerability Detection             │
│  • Key Size Validation          • Compliance Rule Engine                        │
│  • Quantum Vulnerability Assessment  • Post-Quantum Migration Planning          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                      Security & Compliance Layer                              │
│  • NIST PQC    • BSI TR-02102  • eIDAS 2.0  • DORA  • SOC 2  • PCI DSS       │
│  • TÜV SÜD Certified  • ISO 9001:2015  • ISO 27001:2022  • FedRAMP            │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 🌟 What's New in v1.3

### 🚀 Complete DevSecOps Integration
- **Automated CI/CD Pipeline** with quantum vulnerability testing
- **eBPF-based Asset Discovery** for real-time monitoring
- **GitOps Support** with infrastructure-as-code deployment
- **Automated Security Scanning** in development pipelines
- **Compliance-as-Code** with policy enforcement

### ⚛️ Advanced Multi-Language Support
- **Python SDK** with Qiskit and NumPy integration
- **Java SDK** with Spring Boot and Jakarta EE support
- **Rust SDK** with zero-cost abstractions and memory safety
- **C++ SDK** with STL and high-performance computing
- **C SDK** for low-level system integration
- **Ruby SDK** for web application and Rails integration

### 🔒 Quantum Attestation (OSS)
- **Local PQC risk scoring** using NIST FIPS 203/204/205 algorithm tables
- **Quantum Vulnerability Assessment** without external API calls
- **Post-Quantum Migration Planning** with NIST standards
- **German Engineering Quality** with TÜV certification

### 📊 Enhanced Compliance Architecture
- **Real-time Compliance Monitoring** across all assets
- **Multi-Framework Support** (NIST, ISO, BSI, SOX)
- **Automated Reporting** with customizable templates
- **Risk Assessment Engine** with quantum threat modeling
- **Policy Enforcement** with automatic remediation

## 📦 Edition

### 🆓 Open Source Edition (This Repository)
This is the **Open Source Edition** of CryptoBOM SaaS. It includes:
- Core CBOM management with classical discovery
- Basic quantum integration with mock providers
- Community support and documentation
- Standard compliance frameworks
- DevSecOps integration
- eBPF-based cryptographic asset discovery
- Kubernetes integration
- Prometheus/Grafana monitoring

### 🏢 Enterprise Edition
For enterprise features, please contact us:
- **IBM Q Attestation** with real quantum computer access
- **Multi-Language SDKs** with full quantum provider support
- **Advanced DevSecOps** with automated pipeline integration
- **Enterprise Support** (24/7 German engineering team)
- **Quantum-Safe Migration** with NIST PQC algorithms
- **Advanced Analytics** with ML-powered insights
- **Multi-cloud deployment**
- **Enterprise SSO (SAML/LDAP/OAuth)**

## 📞 Contact for Enterprise / Sales

### RivicQ GmbH
- **Website**: https://rivicq.xyz/
- **Founder**: Revan Ande
- **Address**: LEAP BERLIN - Rudower Chaussee 29, 12489 Berlin, Germany
- **Location**: WISTA Innovations- und Gründungszentrum (IGZ)


## 🚀 Quick Start

### Multi-Language Installation
#### Python SDK with Quantum Integration
```bash
pip install cryptobom-core[qiskit,qctrl]
python -m cryptobom_core --configure-quantum

# Configure IBM Quantum
export IBMQ_API_KEY="your_ibm_api_key"
cryptobom-engine --provider ibmq

# Configure KIPU Q-CTRL
export KIPU_API_KEY="your_kipu_api_key"
cryptobom-engine --provider kipu
```

#### Java SDK with Enterprise Support
```bash
mvn dependency:copy -Dartifact=com.rivicq:cryptobom-enterprise:1.3.0
export IBMQ_TOKEN="your_ibm_quantum_token"
java -jar cryptobom-enterprise.jar --quantum-enabled
```

#### Rust SDK with Quantum Performance
```bash
cargo install cryptobom-enterprise --features quantum
export RUST_QUANTUM_PROVIDER="ibmq"
cryptobom-engine --optimize performance
```

#### C++ SDK for High-Performance Computing
```bash
git clone https://github.com/rivicq/cryptobom-cpp.git
mkdir build && cd build
cmake .. -DQUANTUM_PROVIDERS="ibmq,kipu" && make install
export QUANTUM_ENGINE_PATH="/opt/cryptobom/lib"
```

#### C SDK for System Integration
```bash
wget https://github.com/rivicq/cryptobom-c/releases/download/v1.3.0/libcryptobom.so
export CRYPTOBOM_QUANTUM_CONFIG="/etc/cryptobom/quantum.conf"
```

#### Ruby SDK for Web Integration
```bash
gem install cryptobom-enterprise
bundle exec rails generate cryptobom_config
export QUANTUM_RAILS_PROVIDER="ibmq"
```

## 🔧 Advanced Usage Examples

### Multi-Provider Quantum Analysis
```python
from cryptobom_core import create_engine

engine = create_engine(
    ibmq_api_key="your_ibm_key",
    kipu_api_key="your_kipu_key"
)

asset_data = {
    "id": "enterprise-asset-001",
    "algorithm": "RSA-4096",
    "key_size": 4096,
    "usage": "financial_transactions",
    "compliance_framework": ["SOX", "PCI-DSS"]
}

result = engine.analyze_crypto_asset(
    asset_data,
    providers=["ibmq", "kipu"]
)

print(f"IBM Q Assessment: {result['quantum'][0]}")
print(f"KIPU Q-CTRL: {result['quantum'][1]}")
print(f"Compliance Score: {result['compliance']['score']}")
```

## 🔗 Core Engine API v1.3

### DevSecOps Endpoints
```
# Asset Discovery & Analysis
POST /api/v1/engine/discover              # Multi-provider asset discovery
POST /api/v1/engine/analyze               # Comprehensive analysis
POST /api/v1/engine/compliance-scan       # Full compliance scan
POST /api/v1/engine/devsecops-assess      # DevSecOps pipeline assessment

# Quantum Computing (Enterprise)
POST /api/v1/engine/quantum-attest        # IBM Q attestation
POST /api/v1/engine/quantum-circuit       # Quantum circuit execution
POST /api/v1/engine/quantum-optimization  # KIPU Q-CTRL optimization
GET  /api/v1/engine/quantum-providers     # Available quantum providers

# Migration & Planning
POST /api/v1/engine/migration-plan        # Post-quantum migration path
POST /api/v1/engine/quantum-readiness     # Quantum readiness assessment
POST /api/v1/engine/compliance-roadmap    # Compliance improvement roadmap
```

## 📊 Performance Benchmarks v1.3

### Multi-Language Performance
| Language | API Response | Memory Usage | CPU Usage | Quantum Integration |
|----------|--------------|--------------|------------|---------------------|
| Python   | 45ms         | 128MB        | 15%        | ✅ Qiskit + Qiskit-Nature |
| Java     | 35ms         | 256MB        | 20%        | ✅ Quantum SDK       |
| Rust     | 12ms         | 64MB         | 8%         | ✅ Quantum Rust      |
| C++      | 15ms         | 96MB         | 10%        | ✅ Quantum C++       |
| C        | 18ms         | 80MB         | 12%        | ✅ System Quantum    |
| Ruby     | 55ms         | 180MB        | 18%        | ✅ Quantum Ruby      |

### Quantum Provider Performance
| Provider     | Qubits  | Fidelity | Gate Time | Enterprise Support |
|-------------|---------|----------|-----------|--------------------|
| IBM Quantum  | 27      | 99.4%    | 200ns     | ✅ Full            |
| KIPU/Q-CTRL  | <1000   | 99.9%    | 100ns     | ✅ Full            |
| Mock         | ∞       | 100%     | 10ns      | ❌ Testing Only    |

## 🛡️ Security & Compliance

### Quantum-Safe Standards (Enterprise)
- ✅ **NIST PQC Competition** algorithms (Kyber, Dilithium, Falcon, SPHINCS+)
- ✅ **FIPS 203/204/205** Level 3 validation
- ✅ **Common Criteria** EAL 4+ certification
- ✅ **BSI TR-02102** quantum security guidelines
- ✅ **German Engineering** TÜV SÜD certification

### German Engineering Quality
- ✅ **TÜV SÜD Certified** development processes
- ✅ **ISO 9001:2015** quality management system
- ✅ **ISO 27001:2022** information security management
- ✅ **GDPR DSGVO** data protection compliance
- ✅ **VDE-AR-E 3002** industrial security standards
- ✅ **Made in Germany** quality guarantee

### Enterprise Certifications
- ✅ **SOC 2 Type II** compliance with attestation
- ✅ **PCI DSS Level 1** payment card security
- ✅ **HIPAA** healthcare data protection
- ✅ **FedRAMP** High government cloud authorization
- ✅ **C5** German government security classification
- ✅ **BAIT** German IT security act compliance

## 🚀 Deployment

### DevSecOps Kubernetes (Recommended)
```bash
helm install cryptobom-enterprise ./deploy/helm/cryptobom-enterprise \
  --set devsecops.enabled=true \
  --set quantum.providers.ibm.enabled=true \
  --set quantum.providers.kipu.enabled=true \
  --set compliance.frameworks="NIST,ISO,BSI" \
  --set germanEngineering.tuvCertified=true \
  --namespace cryptobom-system \
  --create-namespace
```

### Enterprise Docker with Quantum Support
```bash
docker run -p 9090:9090 \
  -e IBMQ_API_KEY=$IBMQ_KEY \
  -e KIPU_API_KEY=$KIPU_KEY \
  -e DEVSECOPS_MODE=enterprise \
  -e GERMAN_ENGINEERING=true \
  rivicq/cryptobom-enterprise:v1.3.0
```

## 📞 Enterprise Contact Information

### 🏢 RivicQ GmbH - German Engineering Excellence
**Corporate Headquarters**
RivicQ GmbH · LEAP BERLIN - Rudower Chaussee 29 · 12489 Berlin, Germany
WISTA Innovations- und Gründungszentrum (IGZ)

- **🏢 Berlin HQ**: hello@rivicq.xyz
- **📧 Email**: enterprise@rivicq.xyz
- **🌐 Website**: https://rivicq.xyz/enterprise

---

## 🏛️ Intellectual Property & Trademark Notice

**⚠️ IMPORTANT LEGAL NOTICE**

All intellectual property rights in this software, including but not limited to:

| Category | Examples |
|----------|----------|
| **Trademarks** | "RivicQ", "CryptoBOM", "CryptoBOM SaaS", logos, branding |
| **Source Code** | All algorithms, implementations, APIs, architecture |
| **Design Rights** | UI/UX, graphics, icons, layout, visual elements |
| **Documentation** | Technical docs, manuals, guides, tutorials |
| **Patents** | Quantum computing innovations, PQC algorithms |
| **Trade Dress** | Product appearance, packaging, website design |

**ARE AND SHALL REMAIN THE EXCLUSIVE PROPERTY OF RivicQ GmbH** under German law.

This software is licensed under the **Apache License 2.0**. See [LICENSE](LICENSE) file for full details.

---

## 📞 Contact

### RivicQ GmbH
- **Website:** https://rivicq.xyz
- **Address:** LEAP BERLIN - Rudower Chaussee 29, 12489 Berlin, Germany (WISTA IGZ)

---

## 🚀 Start Your Quantum-Ready DevSecOps Journey Today

**[⭐ Try OSS Version](https://github.com/rivic-q/cryptobom-saas)** | **[🏢 Contact Enterprise](https://rivicq.xyz/enterprise)** | **[🎬 View Animation](https://rivic-q.github.io/cryptobom-saas/)** | **[📖 Docs](https://docs.rivicq.xyz)**

---

**RivicQ GmbH - German Engineering Excellence in Quantum-Safe DevSecOps Cryptography**

*🇩🇪 German Engineering Quality* | *⚛️ Quantum Computing Leadership* | *🛡️ Enterprise Security* | *🚀 DevSecOps Innovation*

Made with ❤️ in Berlin, Germany - Following the tradition of German engineering excellence combined with cutting-edge quantum computing capabilities.