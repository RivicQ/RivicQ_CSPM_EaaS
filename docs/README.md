# RivicQ documentation

**Live app:** [GitHub Pages](https://rivicq.github.io/RivicQ_CSPM_EaaS/) · **Demo:** [interactive trail](https://rivicq.github.io/RivicQ_CSPM_EaaS/demo) · **Company:** [rivicq.com](https://rivicq.com)

| Legal | Product honesty |
|-------|-----------------|
| [LEGAL.md](../LEGAL.md) — dual license, warranty, export | [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) |
| [PRIVACY.md](../PRIVACY.md) — Pages vs self-host | [DATASETS.md](../DATASETS.md) — synthetic samples only |
| [Contact](contact.html) — public desks on @rivicq.com | [editions.md](editions.md) — Community vs Enterprise |
| [TRADEMARKS.md](../TRADEMARKS.md) — RivicQ marks and third-party names | [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) |
| [NOTICE](../NOTICE) · [LICENSE](../LICENSE) | |

The Pages site is a **static DEMO workspace** (labeled sample data). Production authentication is unchanged: `GET /api/v1/auth/demo` is issued only when `DEMO_MODE` is enabled on a backend. Client demo markers are not JWTs. This applies to CSPM only; the EaaS developer portal is served by its standalone binary, not GitHub Pages, and EaaS is excluded from CSPM scores and pilot/production claims.

## EaaS (standalone; separate from CSPM)

Branch `feature/eaas-product-foundation`. Evidence: `cmd/eaas`, `internal/eaas`, `web/eaas/index.html`, `deploy/migrations/004_eaas_schema.sql`, `.github/workflows/eaas-ci.yml`. Local sandbox only; not a hosted or production-ready service.

- [EaaS product status](EAAS_PRODUCT_STATUS.md) — VERIFIED / LIMITED / Experimental / blocked boundaries
- [EaaS API](EAAS_API.md) — `/healthz`, `/api/eaas/v1/*`, `/api/beta/v1/*`
- [EaaS deployment](EAAS_DEPLOYMENT.md) — default `:9091`, `/` and `/portal`, sandbox state file
- [EaaS security & privacy](EAAS_SECURITY_PRIVACY.md) — hashed keys, metadata-only usage, base64 private bytes in state
- [EaaS limitations](EAAS_LIMITATIONS.md) — no hosted deployment, payments, email, webhooks, Postgres repository, CAVP/FIPS, AI/quantum-hardware/HSM/wireless
- [EaaS testing & CI](EAAS_TESTING_CI.md) — seven local package tests; full repository suite passed locally
- [EaaS freemium & metering](EAAS_FREEMIUM_AND_METERING.md) — Free = 10,000 operations/month and 60 RPM, enforced; plan switch without payment

## Controlled pilot

- [Pilot gate](PILOT_READINESS.md) — what is ready, limited, planned, or blocked
- [Pilot onboarding](PILOT_ONBOARDING.md) — API, Pages, smoke tests, handoff
- [Pilot acceptance criteria](PILOT_ACCEPTANCE_CRITERIA.md) — measurable tests
- [Capability manifest](CAPABILITIES.yaml) — machine-readable status published with Pages
- [Pilot landing page](../pilot/) — public entry point for the controlled pilot

UI colors follow the **Security Cloud** nebula ledger (`#000000` canvas, `#0A0A0F` surface, violet `#7C3AED`). Control mappings are not certifications. Designed HTML hub: [docs/index.html](index.html).

## Getting started

- [CBOM Quickstart](../QUICKSTART_CBOM.md) — scan your first asset
- [Deployment](DEPLOYMENT.md) — Docker, Kubernetes, production config
- [Environment variables](DEPLOY_ENV.md) — secrets and OAuth
- [Frontend](../web/README.md) — React console
- [Contributing](../CONTRIBUTING.md)

## Product

- [Product status](PRODUCT_STATUS.md) — OSS vs Enterprise, audits, scores, website scan
- [BOM framework](BOM_FRAMEWORK.md) — Community CBOM/SBOM; Enterprise QBOM, HBOM, AIBOM, IBOM
- [Roadmap](ROADMAP.md) — Builds 2–5 and quantum track
- [Qiskit pipeline](QISKIT_PIPELINE.md) — local profile vs optional Aer vs IBM Runtime
- [PQC Migration Guide](PQC_MIGRATION.md)
- [OSS Architecture](oss-architecture.md)
- [Enterprise SaaS architecture](ARCHITECTURE.md) — four-layer CBOM, control plane, hardware/QSIC scope
- [Client architecture](CLIENT_ARCHITECTURE.md) — discover → mitigate → report from OSS to Enterprise
- [PRD](PRD.md) · [BRD](BRD.md) · [SRD](SRD.md) — product, business, and software requirements. Console maps stay small; the full stage is the Archify site
- [Security Cloud UX](UX_DESIGN.md) — core product visual system
- [Operator UX audit](ux/README.md) — findings queue, IA, scorecard
- [Contact](contact.html) — public desks on @rivicq.com ([CONTACT.md](CONTACT.md))
- [RivicQ Graph](FABRIC.md) — labeled security-graph demo (wordmark GRAPH; path `/fabric`; formerly NEXUS / FABRIC; no customer secrets)
- [Graph rename note](GRAPH.md)
- [Security Intelligence Engine](security-intelligence.md)
- [Security Control Matrix](SECURITY_CONTROL_MATRIX.md) — mappings, not certifications
- [Optional scanners](INTEGRATIONS.md) — Syft, Trivy, Grype, Gitleaks, OSV on PATH
- [Rollback Runbook](ROLLBACK_RUNBOOK.md)

## Partners (Infineon / G+D)

One vendor-neutral platform; Infineon and G+D are domain profiles, not forks.

- [Partner technical audit](PARTNER_TECHNICAL_AUDIT.md) — inventory, gaps, plan
- [Infineon readiness](INFINEON.md) · [G+D readiness](GD.md)
- [Firmware static analysis](FIRMWARE_ANALYSIS.md) · [Identity & certificate analysis](IDENTITY_CRYPTO.md)
- [Embedded crypto model](EMBEDDED_CRYPTO.md) · [Device-to-cloud path](DEVICE_TO_CLOUD.md)
- [PQC: embedded](PQC_EMBEDDED.md) · [PQC: identity](PQC_IDENTITY.md) · [Crypto-agility](CRYPTO_AGILITY.md)
- [Partner validation](PARTNER_VALIDATION.md) · [fixtures](../fixtures/partners/README.md)
- [Firmware & identity analysis API](FIRMWARE_IDENTITY_API.md) · [POC script](../scripts/poc/partner_artifact_analysis.sh)

## Developers

- [OpenAPI spec](openapi.yaml)
- [Plugin development](plugin-development.md)
- [Enterprise SDK](enterprise-sdk.md)
- [Quantum SDK](quantum-sdk.md)
- [Language SDKs](sdks/README.md)

## Architecture decisions

- [ADR-001: Database](adr/adr-001-database.md)
- [ADR-002: Frontend](adr/adr-002-frontend.md)
