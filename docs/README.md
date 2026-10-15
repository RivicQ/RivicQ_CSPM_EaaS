# RivicQ documentation

**Live app:** [GitHub Pages](https://rivicq.github.io/RivicQ_CSPM_EaaS/) · **Demo:** [interactive trail](https://rivicq.github.io/RivicQ_CSPM_EaaS/demo) · **Company:** [rivicq.com](https://rivicq.com)

**Rendered docs:** [Archify library](https://rivicq.github.io/RivicQ_CSPM_EaaS/archify/site/index.html#types). Source files stay in the repository. The Pages site does not publish raw markdown.

| Legal | Product honesty |
|-------|-----------------|
| [Legal](https://rivicq.github.io/RivicQ_CSPM_EaaS/archify/site/index.html#types/legal) — dual license, warranty, export | [Known limitations](https://rivicq.github.io/RivicQ_CSPM_EaaS/archify/site/index.html#types/known_limitations) |
| [Privacy](https://rivicq.github.io/RivicQ_CSPM_EaaS/archify/site/index.html#types/privacy) — Pages vs self-host | [Datasets](https://rivicq.github.io/RivicQ_CSPM_EaaS/archify/site/index.html#types/datasets) — synthetic samples only |
| [Contact](https://rivicq.github.io/RivicQ_CSPM_EaaS/archify/site/index.html#types/contact) — public desks on @rivicq.com | [Editions](https://rivicq.github.io/RivicQ_CSPM_EaaS/archify/site/index.html#types/editions) — Community vs Enterprise |
| [Trademarks](https://rivicq.github.io/RivicQ_CSPM_EaaS/archify/site/index.html#types/trademarks) — RivicQ marks and third-party names | [Launch checklist](LAUNCH_CHECKLIST.md) |
| [Notice](https://rivicq.github.io/RivicQ_CSPM_EaaS/archify/site/index.html#types/notice) · [LICENSE](../LICENSE) | |

The Pages site is a **static DEMO workspace** (labeled sample data). Production authentication is unchanged: `GET /api/v1/auth/demo` is issued only when `DEMO_MODE` is enabled on a backend. Client demo markers are not JWTs.

Color scheme is Nebula (the designed near-black violet archive), Day (the same archive on pale paper), or Auto. Control mappings are not certifications. HTML hub: [docs/index.html](index.html), which links into the Archify reader.

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
