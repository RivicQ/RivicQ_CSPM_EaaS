# Release Notes - CryptoBOM SaaS

---

## 📦 Release v1.3.0 (Current)

**Release Date:** 2026  
**Edition:** Open Source  
**Status:** ✅ Stable

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

Use this checklist every time you cut a production release.

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
- [ ] Helm / GKE deploy workflow triggered with the correct image tag:
  ```bash
  # via GitHub Actions – Actions → Deploy to GCP → Run workflow
  ```
- [ ] Post-deploy health check passes:
  ```bash
  curl https://<your-domain>/healthz
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

- `latest` - Latest stable release
- `v1.3.0` - Specific version tag
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

### Binaries

```bash
# Download from releases
curl -L -o cryptobom-oss https://github.com/rivic-q/cryptobom-saas/releases/download/v1.3.0/cryptobom-oss
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
git clone -b v1.3.0 --depth 1 https://github.com/rivic-q/cryptobom-saas.git
```

---

## ☁️ Cloud Native Deployment

### Kubernetes

```bash
# Helm deployment
helm repo add rivicq https://rivicq.xyz/charts
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

Email: security@rivicq.xyz  
PGP Key: Available on request

---

## 🏢 Enterprise Edition

The Open Source Edition is free to use. For enterprise features:

| Feature | OSS | Enterprise |
|---------|-----|------------|
| CBOM Management | ✅ | ✅ |
| Basic Discovery | ✅ | ✅ |
| Mock Quantum | ✅ | ✅ |
| Real IBM Quantum | ❌ | ✅ |
| Real KIPU Q-CTRL | ❌ | ✅ |
| Multi-Language SDKs | Mock Only | Full |
| TÜV Certification | ❌ | ✅ |
| 24/7 Support | ❌ | ✅ |
| SOC 2 / PCI DSS | ❌ | ✅ |

**Contact:** enterprise@rivicq.xyz  
**Website:** https://rivicq.xyz/enterprise

---

## 📞 Support

### Community Support
- GitHub Discussions: https://github.com/rivic-q/cryptobom-saas/discussions
- Issue Tracker: https://github.com/rivic-q/cryptobom-saas/issues

### Enterprise Support
- Email: enterprise@rivicq.xyz
- Portal: https://portal.rivicq.xyz/support

---

## ⚖️ License

Copyright (c) 2024 RivicQ GmbH. All rights reserved.

All intellectual property, designs, trademarks, and innovations are the exclusive property of **RivicQ GmbH** under German and international law.

See [LICENSE](LICENSE) for full license details.

---

**© 2026 RivicQ GmbH. All Rights Reserved.**

*German Engineering Excellence in Quantum-Safe Cryptography*
