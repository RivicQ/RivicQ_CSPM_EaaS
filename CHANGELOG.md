# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-beta1] - 2026-03-12

> **Enterprise MVP – Beta Release**  
> CryptoBOM SaaS is now feature-complete for client beta testing. This release introduces
> end-to-end CBOM scanning, Enterprise multi-cloud capabilities, and a beta sign-up programme.

### 🔐 Headline: CBOM Scanning End-to-End

- **`POST /api/v1/scans`** – New headleap CBOM scan endpoint. Accepts any target (repo path,
  container image, hostname) and triggers a full cryptographic inventory scan.
- **`GET /api/v1/scans/{id}`** – Poll scan status, progress, and summary findings.
- **`GET /api/v1/assets/{id}/bom`** – Retrieve the Cryptographic Bill of Materials for a
  specific asset. Returns algorithm, key size, library, risk level, quantum-safe flag,
  PQC status, location, and BSI TR-02102-1 reference for each component.
- **`scripts/scan-cbom.sh`** – CLI entrypoint for the headleap developer CBOM scan flow.
  Supports any target, scan type, and output path. Falls back to demo mode when the
  backend is unavailable.
- **`QUICKSTART_CBOM.md`** – Complete 5-minute quickstart guide covering CLI, REST API,
  and Web UI scan flows.
- **Scanner UI** – Updated `Scanner.tsx` with a CBOM scan type, scan-target input field,
  and per-job target display. Uses the new `/api/v1/scans` API directly.

### 🌐 Enterprise MVP Completeness

- Enterprise pages for multi-cloud (GCP / AWS / IBM), Quantum, Compliance, CNCF,
  and Terraform are integrated in the frontend (`web/src/pages/enterprise/`).
- Backend Enterprise endpoints (IBM HPCS, AWS CloudHSM, quantum attestation, compliance
  report generation) compile and gracefully degrade when cloud credentials are absent.
- Edition / licence gating is enforced via `internal/edition/edition.go` – OSS vs Enterprise
  is clearly delineated in both backend and frontend.

### 🚀 Beta Sign-Up and Onboarding

- **`BETA_PROGRAM.md`** – Full beta programme description: who it's for, included features,
  security posture, onboarding process, Beta → GA roadmap, and FAQ.
- **`BetaBanner`** component – Dismissible in-app banner on the OSS Dashboard inviting
  users to join the Enterprise beta. Links to GitHub Discussions.

### 📋 Documentation

- `QUICKSTART_CBOM.md` – Headleap developer CBOM scan quickstart (CLI + API + UI).
- `BETA_PROGRAM.md` – Beta programme and onboarding guide.
- `PROJECT_STATUS.md` – Updated to reflect Enterprise MVP feature-complete status.
- `MVP_COMPLETED.md` – Updated to reflect v1.0.0-beta1 readiness.
- `MVP_ROADMAP.md` – Beta vs GA feature distinction added.
- `README.md` – CBOM scanning highlighted as headline feature; beta enrolment link added.
- `VERSION` – Bumped to `1.0.0-beta1` (Enterprise edition).

### Known Limitations (Beta)

- IBM Quantum attestation requires a valid IBM Quantum Network API key.
  Without credentials the system falls back to classical risk scoring (all other features
  remain fully functional).
- Multi-cloud HSM scanning requires cloud credentials configured in Kubernetes secrets.
- Production SLAs begin at GA. Beta support is best-effort.
- SOC 2 Type II and ISO 27001 certifications are planned for GA.

---


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
