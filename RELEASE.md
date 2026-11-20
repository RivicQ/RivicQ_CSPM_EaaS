# Release Notes - CryptoBOM SaaS

## Current state (`main`; local verification after `d0e9dbf`)

**Maturity: controlled pilot (CSPM) plus early beta with manual review (EaaS).
No Stable/GA release is declared.**

- CSPM: controlled-pilot ready for static inventory with an operator; not approved
  for unattended production (`docs/PILOT_READINESS.md`,
  `RIVICQ_PRODUCTION_READINESS.md`).
- EaaS: standalone local sandbox (`cmd/eaas`, `internal/eaas`, `web/eaas`);
  `VERIFIED` API/portal, `LIMITED` JSON state file and manual beta review,
  `Beta implemented` classical operations, `Experimental` PQC, `BLOCKED`
  Postgres repository, `NOT_IMPLEMENTED` hosted EaaS (`docs/EAAS_PRODUCT_STATUS.md`).
- Local verification on the current tree after `d0e9dbf`: `go vet ./...`,
  `go build ./...`, full `go test ./...`, web type-check/lint, and Pages
  verifier (109 checks) passed. GitHub Pages workflow `#120` succeeded for the
  earlier EaaS docs publication; the new report is included in the local
  composite build. This is not a hosted backend deploy.
- `VERSION` remains `1.2.0` as the last recorded build stamp; work after that is
  listed under `Unreleased` in `CHANGELOG.md`. No version bump is implied here.
- TÜV, SOC 2 Type II, PCI DSS, and ISO 27001 certificates are **not held**. Control
  mappings are not certifications and are not active entitlements.

See `docs/ALPHA_BETA_TEST_REPORT.md` for the alpha/beta evidence record.

---

## 📦 Release v1.3.1 (historical)

**Release Date:** 2026-05-28
**Edition:** Open Source + Enterprise
**Status:** historical beta-ready milestone; superseded by the current controlled-pilot state above. Not Stable or GA.

### 🚀 New in v1.3.1

#### OSS + Enterprise Redesign
- Added a dedicated redesign and pilot plan for the OSS-first, CNCF-aligned product direction.
- Linked the redesign from the main README for easier discovery.
- Clarified the current CBOM endpoint-detection pipeline and the Flyingduck pilot flow.

#### QBOM Foundations
- Introduced QBOM language as the quantum-extension layer on top of CBOM.
- Documented QBOM features for endpoint-level quantum risk, PQC migration planning, and compliance correlation.
- Added the QBOM feature backlog to the roadmap so upcoming work is visible.

#### Benchmark and Readiness Updates
- Updated benchmark expectations to use the current 10k-asset reference baseline.
- Reframed the roadmap from historical MVP gaps to active beta and pilot refinement work.

### 📝 Notes

- The current codebase already supports CBOM scanning, endpoint discovery, inventory views, and enterprise integrations.
- Future work is concentrated on deeper endpoint correlation, QBOM analytics, and customer pilot refinement rather than core MVP recovery.

---

## 📦 Release v1.3.0 (historical)

**Release Date:** 2026  
**Edition:** Open Source  
**Status:** historical milestone; no Stable/GA release is declared for this repository

### 🚀 New Features

#### DevSecOps Integration
- Automated CI/CD pipeline with quantum vulnerability testing
- eBPF-based asset discovery for real-time monitoring
- GitOps support with infrastructure-as-code deployment
- Automated security scanning in development pipelines
- Compliance-as-code with policy enforcement

#### Multi-Language Support
- Python SDK with Qiskit and NumPy integration
- Java SDK with Spring Boot and Jakarta EE support
- Rust SDK with zero-cost abstractions and memory safety
- C++ SDK with STL and high-performance computing
- C SDK for low-level system integration
- Ruby SDK for web application and Rails integration

#### Quantum Computing
- Mock quantum provider for testing (OSS edition)
- IBM Quantum integration preparation (Enterprise)
- KIPU Q-CTRL integration preparation (Enterprise)
- Quantum vulnerability assessment framework
- Post-quantum migration planning

### 🛠️ Improvements

- Enhanced CBOM (Cryptographic Bill of Materials) management
- Improved asset discovery accuracy
- Better compliance framework support (NIST, ISO, BSI)
- Kubernetes operator improvements
- Prometheus/Grafana metrics enhancements

### 🐛 Bug Fixes

- Fixed memory leak in quantum circuit simulation
- Resolved authentication timeout issues
- Fixed Kubernetes namespace isolation
- Corrected compliance report generation

### 📋 Changelog

```bash
# View full changelog
git log --oneline --all

# View release tags
git tag -l

# Check current version
cat VERSION
```

---

## 🔄 Previous Releases

### v1.2.0
- Added Kubernetes operator support
- Enhanced Prometheus metrics
- Bug fixes and performance improvements

### v1.1.0
- Initial DevSecOps integration
- Basic compliance framework support
- Community contributions

### v1.0.0
- Initial release
- Core CBOM management
- Basic asset discovery

---

## ✅ Production Release Checklist

Template for a future controlled release; it is not evidence that a production
release has happened or is authorized. No Stable/GA release is declared here.

### Pre-release

- [ ] All CI checks pass on the release branch (`ci-oss.yml`, `ci-cd.yml`)
- [ ] No critical/high open security advisories (`trivy`, `gosec`)
- [ ] `go mod tidy` run; `go.sum` committed
- [ ] All database migrations tested against a clean PostgreSQL 15 instance
  ```bash
  psql "$DATABASE_URL" -f deploy/migrations/001_initial_schema.sql
  ```
- [ ] Version bumped in `VERSION` file and `web/package.json`
- [ ] `RELEASE.md` and `CHANGELOG.md` updated
- [ ] Docker images build successfully for both editions:
  ```bash
  docker build -f deploy/docker/Dockerfile.oss -t cryptobom-oss:$VERSION .
  docker build -f deploy/docker/Dockerfile.enterprise -t cryptobom-enterprise:$VERSION .
  ```
- [ ] Smoke test via Docker Compose:
  ```bash
  VERSION=$VERSION docker compose up -d && curl http://localhost:8080/healthz
  ```

### Secrets & Configuration

- [ ] `JWT_SECRET` is a random 32+ character value (not the default)
- [ ] `DATABASE_URL` points to production Cloud SQL (never a dev DB)
- [ ] Production deploy secrets are populated in GitHub Actions and secret managers:
  - `KUBE_CONFIG_STAGING`
  - `KUBE_CONFIG_PROD`
  - `IBMQ_API_KEY`
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `GCP_WORKLOAD_IDENTITY_PROVIDER`
  - `GCP_SERVICE_ACCOUNT`
  - `GCP_PROJECT_ID`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `IBM_CLOUD_API_KEY`
  - `IBM_HPCS_INSTANCE`
- [ ] All GCP Secret Manager secrets populated:
  - `cryptobom-jwt-secret-production`
  - `cryptobom-db-password-production`
  - `cryptobom-ibm-quantum-key-production` (Enterprise)
  - `cryptobom-ibm-cloud-key-production` (Enterprise)
  - `cryptobom-stripe-secret-production` (if billing enabled)
- [ ] Terraform state backend (`gcs` bucket) exists and is accessible
- [ ] GCP Workload Identity binding verified for `cryptobom-app-{env}` SA

### Infrastructure (GCP)

- [ ] `terraform plan` reviewed and approved:
  ```bash
  cd deploy/terraform/gcp
  terraform plan -var-file=production.tfvars
  ```
- [ ] Cloud SQL deletion protection enabled (`deletion_protection = true`)
- [ ] GKE cluster in `STABLE` release channel
- [ ] Cloud KMS / Cloud HSM keys provisioned
- [ ] VPC Flow Logs enabled
- [ ] Binary Authorization policy enforced

### Deployment

- [ ] Database migrations applied to production (manual step):
  ```bash
  psql "$PROD_DATABASE_URL" -f deploy/migrations/001_initial_schema.sql
  psql "$PROD_DATABASE_URL" -f deploy/migrations/002_enterprise_features.sql
  ```
- [ ] Production bootstrap check passed:
  ```bash
  API_URL=https://<your-api>/api/v1 \
  DATABASE_URL=... JWT_SECRET=... KUBE_CONFIG_STAGING=... KUBE_CONFIG_PROD=... \
  IBMQ_API_KEY=... GCP_WORKLOAD_IDENTITY_PROVIDER=... GCP_SERVICE_ACCOUNT=... \
  GCP_PROJECT_ID=... AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
  IBM_CLOUD_API_KEY=... IBM_HPCS_INSTANCE=... \
  ./scripts/production-readiness.sh --strict
  ```
- [ ] Helm / GKE deploy workflow triggered with the correct image tag:
  ```bash
  # via GitHub Actions – Actions → Deploy to GCP → Run workflow
  ```
- [ ] Post-deploy health check passes:
  ```bash
  curl https://<your-domain>/healthz
  ```
- [ ] Post-deploy smoke and rollback helper passes:
  ```bash
  SERVICE_URL=https://<your-domain> \
  PREVIOUS_IMAGE_TAG=<previous-tag> \
  ./scripts/post_deploy_smoke.sh --service-url https://<your-domain>
  ```
- [ ] Rollback plan noted (previous image tag ready)

### Post-release

- [ ] Git release tag created and pushed:
  ```bash
  git tag -a v$VERSION -m "Release v$VERSION"
  git push origin v$VERSION
  ```
- [ ] GitHub Release published with changelog excerpt
- [ ] Docker Hub / GHCR images tagged with version
- [ ] Monitoring dashboard reviewed (Prometheus / Grafana)
- [ ] Stakeholders notified

---

### From v1.2.x to v1.3.0

```bash
# Pull latest changes
git fetch origin
git pull origin master

# Update dependencies
go mod download
cd web && npm install

# Rebuild
./build.sh

# Restart services
kubectl rollout restart deployment/cryptobom-oss -n cryptobom-system
```

### Breaking Changes

- API endpoint `/api/v1/scan` renamed to `/api/v1/engine/analyze`
- Configuration format updated (see `demo-config.yaml`)
- Deprecated quantum mock provider flags removed

---

## 🏷️ Versioning Strategy

We use **Semantic Versioning (SemVer)**:

```
MAJOR.MINOR.PATCH
```

- **MAJOR** - Incompatible API changes
- **MINOR** - New functionality (backward compatible)
- **PATCH** - Bug fixes (backward compatible)

### Tags

- `latest` - no stable/GA artifact declared; do not treat this as a release channel
- `v1.3.0` - Historical version tag
- `v1.3` - Minor version tag (points to latest v1.3.x)
- `dev` - Development branch

```bash
# List all tags
git tag -l

# Checkout specific version
git checkout v1.3.0

# Create a release tag (maintainers only)
git tag -a v1.3.0 -m "Release v1.3.0"
git push origin v1.3.0
```

---

## 📥 Downloading Releases

The commands below are historical templates; no v1.3.x GA artifact is declared
by this repository.

### Binaries

```bash
# Download from releases
curl -L -o cryptobom-oss https://github.com/RivicQ/RivicQ_CSPM_EaaS/releases/download/v1.3.0/cryptobom-oss
chmod +x cryptobom-oss
```

### Docker Images

```bash
# Pull OSS edition
docker pull rivicq/cryptobom-oss:v1.3.0

# Pull enterprise edition (requires license)
docker pull rivicq/cryptobom-enterprise:v1.3.0
```

### Source Code

```bash
# Clone specific version
git clone -b v1.3.0 --depth 1 https://github.com/RivicQ/RivicQ_CSPM_EaaS.git
```

---

## ☁️ Cloud Native Deployment

### Kubernetes

```bash
# Helm deployment
helm repo add rivicq https://rivicq.com/charts
helm install cryptobom-oss rivicq/cryptobom-oss --version v1.3.0
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  cryptobom:
    image: rivicq/cryptobom-oss:v1.3.0
    ports:
      - "9090:9090"
    environment:
      - EDITION=oss
      - LOG_LEVEL=info
```

---

## 🔐 Security

### Security Updates

- Critical security patches are released immediately
- Regular security updates monthly
- Subscribe to security advisories

### Reporting Vulnerabilities

**Do NOT** open public issues for security vulnerabilities.

Email: hello@rivicq.com  
PGP Key: Available on request

---

## 🏢 Enterprise Edition

The Open Source Edition is free to use. For enterprise features:

| Feature | OSS | Enterprise |
|---------|-----|------------|
| CBOM Management | ✅ | ✅ |
| Basic Discovery | ✅ | ✅ |
| Mock Quantum | ✅ | ✅ |
| Real IBM Quantum | ❌ | Preparation only; no live job in evidence |
| Real KIPU Q-CTRL | ❌ | Preparation only; no live integration in evidence |
| Multi-Language SDKs | Mock Only | Full |
| TÜV Certification | Not held | Not held |
| 24/7 Support | ❌ | ✅ |
| SOC 2 / PCI DSS | Not held; mappings only | Not held; mappings only |

Control mappings are not certifications. No TÜV, SOC 2, PCI DSS, or ISO 27001
certificate is held or offered as an active entitlement.

**Contact:** enterprise@rivicq.com  
**Website:** https://rivicq.com/enterprise

---

## 📞 Support

### Community Support
- GitHub Discussions: https://github.com/RivicQ/RivicQ_CSPM_EaaS/discussions
- Issue Tracker: https://github.com/RivicQ/RivicQ_CSPM_EaaS/issues

### Enterprise Support
- Email: enterprise@rivicq.com
- Portal: https://portal.rivicq.com/support

---

## ⚖️ License

Copyright (c) 2024 RivicQ GmbH. All rights reserved.

All intellectual property, designs, trademarks, and innovations are the exclusive property of **RivicQ GmbH** under German and international law.

See [LICENSE](LICENSE) for full license details.

---

**© 2026 RivicQ GmbH. All Rights Reserved.**

*German Engineering Excellence in Quantum-Safe Cryptography*
