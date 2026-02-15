# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.1.0] - 2026-02-15

### Added
- 🔐 **CBOM Scanner** - Discover cryptographic assets in Kubernetes, containers, and repositories
- 📊 **Algorithm Analysis** - Detect RSA, AES, ECDSA, and other cryptographic algorithms
- ⚛️ **Quantum Vulnerability Detection** - Identify quantum-vulnerable algorithms
- 📋 **Compliance Scanning** - NIST, ISO, BSI, PCI-DSS, SOC2 framework support
- 🛡️ **DevSecOps Integration** - CI/CD pipeline assessment
- 🔄 **PQC Migration Planning** - Generate migration plans to NIST PQC algorithms
- 🐳 **Docker Compose** - Full stack deployment with Go, Node, Python
- 📝 **Examples** - scan.py, upgrade.go, risk_compliance.py scripts
- 🧪 **Full Test Suite** - Unit and integration tests
- 📚 **OpenAPI Specification** - Full API documentation
- 📄 **Apache 2.0 License** - Open source license with RivicQ IP supplement

### Features
- Asset discovery via Kubernetes, eBPF, network scanning
- Real-time quantum vulnerability assessment
- Compliance report generation (JSON)
- Post-quantum migration planning
- Multi-language SDK support (Python, Go)
- Enterprise IBM Quantum integration (Enterprise Edition)

### Architecture
- Clean architecture with separation of concerns
- RESTful API design
- Modular quantum provider system
- DevSecOps-ready deployment configurations

### Quick Start
```bash
# Docker Compose
docker compose up -d

# Scan for cryptographic assets
python examples/scan.py --target all --output cbom.json

# Check compliance
python examples/risk_compliance.py --framework NIST

# Generate migration plan
go run examples/upgrade.go --output migration-plan.json
```

### Binary Release
Pre-built binaries available:
- `bin/cryptobom-oss-v0.1.0` - Linux amd64
- Docker image: `rivicq/cryptobom-oss:v0.1.0`

---

## [v1.3.0] - 2026-02-12

### Added
- Initial release with full DevSecOps integration
- IBM Quantum and KIPU Q-CTRL integration
- Multi-language SDKs (Python, Java, Rust, C++, C, Ruby)
- TÜV-certified German engineering
- Enterprise SSO (SAML/LDAP/OAuth)

---

## Upcoming Features

### v0.2.0 (Planned)
- [ ] Real IBM Quantum hardware integration
- [ ] Enhanced dashboard with real-time metrics
- [ ] More compliance frameworks
- [ ] Webhook support for CI/CD
- [ ] Plugin system for custom providers

### v0.3.0 (Planned)
- [ ] Machine learning-based threat prediction
- [ ] Automated remediation workflows
- [ ] Enhanced reporting with PDF export
- [ ] Multi-cluster support

---

## Acknowledgments

- IBM Quantum for quantum computing integration
- NIST for PQC standardization
- Open source community

---

**© 2026 RivicQ GmbH - LEAP BERLIN - Rudower Chaussee 29, 12489 Berlin**
**German Engineering Excellence in Quantum-Safe Cryptography**
