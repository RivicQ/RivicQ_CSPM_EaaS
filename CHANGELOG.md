# Changelog

All notable changes to this project will be documented in this file.

## [1.5.8] - 2026-09-03

### Changed
- **Horizon** core UX: sky canvas, pill nav, five-BOM letter tiles, sky primary CTAs, navy chrome with a horizon band.
- Home, workspace, auth, edition switcher, and docs hub share the same visual system ([docs/UX_DESIGN.md](docs/UX_DESIGN.md)).



### Added
- Five-BOM DevSecOps framework: QBOM, AIBOM, SBOM, IBOM, CBOM ([docs/BOM_FRAMEWORK.md](docs/BOM_FRAMEWORK.md)).
- Shared APIs: `/bom/framework`, `/bom/pipeline`, `/bom/unified`, `/governance/controls`, `/hsm/status`, `/quantum/status`, `/security/api`, `/security/ai`.
- Console routes: `/bom`, `/pipeline`, `/security/api`, `/security/ai`, `/connectors/hsm`, `/governance`, `/migration`.
- Community: CBOM + SBOM + local QBOM, TLS API hygiene, pipeline stages 1–6. Enterprise: AIBOM, IBOM, PKCS#11/HSM connector, GRC pack flag.
- Honest HSM and quantum status (disconnected without customer credentials). QSIC remains declared research hardware.

### Changed
- Sky-blue/white Security Cloud UX: slightly larger radii, five-BOM ribbon, pipeline and governance hubs.
- PQC migration guide aligned to local Qiskit taxonomy and optional connectors (not a required IBM Quantum run).

## [1.5.6] - 2026-09-03

### Added
- Client architecture **discover → mitigate → report** on scan intelligence (`client_architecture`, `pqc_readiness`).
- Scan target classes: website, host, IP, server, declared Kubernetes pod (`pod://ns/name[@host]`), declared HSM/TPM/QSIC catalog.
- `GET /api/v1/architecture` and `GET /api/v1/hardware/catalog`.
- High-level SaaS design: [docs/CLIENT_ARCHITECTURE.md](docs/CLIENT_ARCHITECTURE.md).

### Changed
- Community / live GitHub Pages demo is **feature-limited** (no unlabeled Enterprise estate, no DORA pack, no live kube attach).
- OSS edition flags no longer advertise Kubernetes/eBPF as shipped.
- QSIC is declared research hardware inventory, not a shipped or certified module.



### Changed
- Product identity is **RivicQ Security Cloud** (sky-blue/white cryptographic SaaS).
- Removed IBM Plex / Carbon trademark banners from the console, docs hub, marketing, NOTICE, and LEGAL.
- GitHub Pages copies product status, roadmap, architecture, and Qiskit pipeline docs.

## [1.5.4] - 2026-08-19

### Changed
- Restored a **clear sky-blue and white** theme (`#0ea5e9` / `#0284c7` on `#ffffff`). Default mode is light.
- Kept the quieter motion (no glow, blur, or hover-lift).
- Still not IBM Carbon / IBM Plex. Trademark notice is unchanged.

## [1.5.3] - 2026-08-19

### Changed
- Quieted the product theme: dusty violet (`#5a5268` / `#6b6278`) on charcoal surfaces, less saturation than rivicq.com neon.
- Removed glass blur, neon glow, hover-lift, and bouncing motion from the console, homepage, auth, and docs hub.
- IBM trademark notice is unchanged. RivicQ is still not an IBM product.

## [1.5.2] - 2026-08-19

### Changed
- Product theme is RivicQ violet (`#8251f3` / `#301233`) matching rivicq.com, with Outfit + JetBrains Mono.
- Stopped using IBM Carbon colors and IBM Plex as the product design system (IBM ambassador / trademark hygiene).
- Homepage stats no longer claim unproven asset counts or uptime.
- IBM Cloud HPCS no longer defaults status to “Connected”; quantum attestation no longer invents 72/45 scores.

### Security
- Enterprise audit `GetEvent` is scoped to the JWT tenant.

### Legal
- TRADEMARKS.md, LEGAL.md, NOTICE, and in-app notices: IBM, IBM Plex, and Carbon are trademarks of IBM. RivicQ is not an IBM product. Control mappings are not certifications.

## [1.5.1] - 2026-08-19

### Added
- Production legal pack: expanded README (OSS vs Enterprise), LEGAL.md, PRIVACY.md, TRADEMARKS.md, NOTICE, web/README.md.
- IBM Carbon color sweep on remaining UI accents (Green 50 / Blue 60 / Red 60).
- `RequireRole("admin")` on Enterprise SSO and cloud-connector POST routes.
- JWT-only tenant context for API keys and webhooks (no spoofable `X-Tenant-ID`).

### Changed
- CONTRIBUTING.md and docs hub copy: no certification claims for RivicQ itself.
- Docs hub uses Carbon Gray 100 / Blue 60 and honest feature descriptions.

### Security
- API key and webhook mutations scoped to JWT tenant.

## [1.5.0] - 2026-08-19

### Added
- IBM Carbon visual language (Blue 60, Gray 100, Green 50) and IBM Plex Sans/Mono.
- Community vs Enterprise edition cards on Sign-In / Registration.
- Community command center onboarding (no simulated enterprise estate).
- Inventory sort + JSON/PDF export (print-to-PDF, no extra npm dependency).
- Homepage GitHub content scan path; Discover → Analyze → Quantify workflow copy.
- `datasets/` expected-results harness and `make analyze-datasets`.
- `RequireRole` RBAC helper; audit events record JWT tenant and actor.
- LEGAL.md, NOTICE, docs/KNOWN_LIMITATIONS.md, DATASETS.md.

### Changed
- Tenant isolation: Enterprise audit APIs no longer accept spoofable `X-Tenant-ID`.
- Auth forms: field-level email/password validation.

### Security
- Production authentication unchanged. Demo tokens are not JWTs on Pages.

## [1.3.0] - 2026-08-12

### Changed
- Restructured the repository: removed redundant internal planning docs, database dumps, committed binaries, and archived demo fixtures.
- Streamlined `README.md` and added `docs/README.md` plus `docs/editions.md` as the canonical documentation index.

## [1.2.0] - 2026-08-08
- Redesign the full web platform with a minimal light-first enterprise theme
  (indigo/emerald accents, light surfaces, dark-mode toggle preserved).
- Default the app to light mode (`App.tsx`) and rebuild the MUI design system
  (`web/src/theme/tokens.ts`, `web/src/theme/theme.ts`).
- Rebuild the app shell: grouped navigation, collapsible Security Modules section,
  topbar search, edition chip, user menu (`web/src/layouts/Layout.tsx`).
- Rework landing, auth, edition switcher, dashboard, and enterprise pages to the
  new light-first design.
- Complete the Security Modules `SEEDS` catalog: add Cloud Security, Runtime Security,
  Network Security, Detection Engineering, Digital Forensics, and Red Team seeds
  (`web/src/config/modules.ts`).
- Clean up lint warnings in redesigned files; type-check and production build pass.

## [1.1.0] - 2026-05-22
- Remove runtime demo endpoints and seeded fallback data (frontend and backend).
- Add CSPM Control Center scaffold and UX updates for edition gating.
- Neutralize demo dashboard and remove file-coupling from build/run scripts.
- Fix enterprise build issue (sharedapi -> shared) and other build/test fixes.
- Archive demo fixtures to `docs/archive/demo-fixtures` and update demo docs.
- Add deployment env docs (`docs/DEPLOY_ENV.md`).
- Make demo smoke CI job manual to avoid accidental demo runs during PRs.
- Add lightweight IBMQ mock server for local CI/dev use (demo/mock-ibmq).
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
