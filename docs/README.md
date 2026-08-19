# RivicQ documentation

**Live app:** [GitHub Pages](https://rivicq.github.io/RivicQ_CSPM_EaaS/) · **Demo:** [interactive trail](https://rivicq.github.io/RivicQ_CSPM_EaaS/demo) · **Company:** [rivicq.com](https://rivicq.com)

| Legal | Product honesty |
|-------|-----------------|
| [LEGAL.md](../LEGAL.md) — dual license, warranty, export | [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) |
| [PRIVACY.md](../PRIVACY.md) — Pages vs self-host | [DATASETS.md](../DATASETS.md) — synthetic samples only |
| [TRADEMARKS.md](../TRADEMARKS.md) — IBM / IBM Plex / Carbon disclaimer | [editions.md](editions.md) — Community vs Enterprise |
| [NOTICE](../NOTICE) · [LICENSE](../LICENSE) | [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) |

The Pages site is a **static DEMO workspace** (labeled sample data). Production authentication is unchanged: `GET /api/v1/auth/demo` is issued only when `DEMO_MODE` is enabled on a backend. Client demo markers are not JWTs.

UI colors follow a **clear sky-blue and white** theme (`#0284c7` on `#ffffff`). **IBM, IBM Plex, and Carbon are trademarks of IBM. RivicQ is not an IBM product. Control mappings are not certifications.**

## Getting started

- [CBOM Quickstart](../QUICKSTART_CBOM.md) — scan your first asset
- [Deployment](DEPLOYMENT.md) — Docker, Kubernetes, production config
- [Environment variables](DEPLOY_ENV.md) — secrets and OAuth
- [Frontend](../web/README.md) — React console
- [Contributing](../CONTRIBUTING.md)

## Product

- [PQC Migration Guide](PQC_MIGRATION.md)
- [OSS Architecture](oss-architecture.md)
- [Security Intelligence Engine](security-intelligence.md)
- [Security Control Matrix](SECURITY_CONTROL_MATRIX.md) — mappings, not certifications
- [Rollback Runbook](ROLLBACK_RUNBOOK.md)

## Developers

- [OpenAPI spec](openapi.yaml)
- [Plugin development](plugin-development.md)
- [Enterprise SDK](enterprise-sdk.md)
- [Quantum SDK](quantum-sdk.md)
- [Language SDKs](sdks/README.md)

## Architecture decisions

- [ADR-001: Database](adr/adr-001-database.md)
- [ADR-002: Frontend](adr/adr-002-frontend.md)
