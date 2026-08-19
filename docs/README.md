# RivicQ documentation

Live app: [GitHub Pages](https://rivicq.github.io/RivicQ_CSPM_EaaS/) · Demo: [interactive trail](https://rivicq.github.io/RivicQ_CSPM_EaaS/demo) · Company: [rivicq.com](https://rivicq.com)

Legal: [LEGAL.md](../LEGAL.md) · Limitations: [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) · Datasets: [DATASETS.md](../DATASETS.md)

The Pages site is a static DEMO workspace (labeled sample data). Production authentication is unchanged: `GET /api/v1/auth/demo` is issued only when `DEMO_MODE` is enabled.

## Getting started

- [CBOM Quickstart](../QUICKSTART_CBOM.md) — scan your first asset in 5 minutes
- [Deployment](DEPLOYMENT.md) — Docker, Kubernetes, production config
- [Environment variables](DEPLOY_ENV.md) — required secrets and OAuth setup
- [Editions](editions.md) — OSS vs Enterprise

## Product

- [PQC Migration Guide](PQC_MIGRATION.md)
- [OSS Architecture](oss-architecture.md)
- [Security Intelligence Engine](security-intelligence.md)
- [Security Control Matrix](SECURITY_CONTROL_MATRIX.md)
- [Rollback Runbook](ROLLBACK_RUNBOOK.md)

## Developers

- [OpenAPI spec](openapi.yaml) — REST API reference
- [Plugin development](plugin-development.md)
- [Enterprise SDK](enterprise-sdk.md)
- [Quantum SDK](quantum-sdk.md)
- [Language SDKs](sdks/README.md)

## Architecture decisions

- [ADR-001: Database](adr/adr-001-database.md)
- [ADR-002: Frontend](adr/adr-002-frontend.md)
