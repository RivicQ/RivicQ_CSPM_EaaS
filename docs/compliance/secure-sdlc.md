# Secure SDLC Policy

**Effective Date**: 2024-01-01  
**Owner**: Engineering  
**Review Cycle**: Annual

---

## 1. Overview

CryptoBOM follows a Secure Software Development Lifecycle (SSDLC) integrating security controls at every phase of development.

## 2. SDLC Phases

### Phase 1: Requirements & Design

- Security requirements defined alongside functional requirements
- Threat modeling performed for significant new features (STRIDE methodology)
- Architecture review for changes affecting cryptographic operations, data flows, or trust boundaries
- Data classification and privacy impact assessment for new data types

**Gates**: No design approval without threat model for security-relevant features.

### Phase 2: Development

- All code written against secure coding standards (Go: `golangci-lint`; Node: ESLint security rules)
- Developer IDE configured with `gosec` or equivalent SAST
- No secrets in source code (enforced by `detect-secrets` / `gitleaks` pre-commit hook)
- Dependency updates managed via Dependabot (auto-merge for patch; manual for minor/major)
- PII/sensitive data never logged in plaintext

**Required tooling**:
- `golangci-lint` with security rules enabled
- `gitleaks` pre-commit hook
- `govulncheck` for known vulnerability scanning

### Phase 3: Code Review

- All changes require at least 1 reviewer (CODEOWNERS enforced)
- Security-sensitive changes (auth, crypto, IAM) require security team review
- PR checklist must be completed (`.github/pull_request_template.md`)
- No force-push to `master`; linear history preferred

### Phase 4: Testing

| Test Type | Tool | When |
|---|---|---|
| Unit tests | Go `testing` package | Every PR |
| Integration tests | Go test + test containers | Every PR |
| SAST | CodeQL | Every PR |
| SCA (dependency scan) | Dependency Review Action | Every PR |
| Container scan | Trivy | Build stage |
| Secret detection | gitleaks | Pre-commit + CI |
| Infrastructure scan | `terraform validate` + `tfsec` (planned) | Every PR touching Terraform |
| DAST | OWASP ZAP (planned) | Weekly against staging |
| Fuzzing | Go fuzzing (selected packages) | Weekly |

### Phase 5: Build & Release

- Docker images built from minimal base images (`distroless` or `alpine`)
- Multi-stage builds to exclude dev tooling from production image
- Image signing (Cosign) planned for Q2 2025
- SBOM generated via CycloneDX at build time (`.github/workflows/sbom.yml`)
- Images scanned by Artifact Registry before deployment
- Binary Authorization policy enforces only scanned images are deployed to production GKE

### Phase 6: Deployment

- Infrastructure changes via Terraform with PR review and plan review
- Kubernetes manifest changes via PR (GitOps)
- Blue/green or rolling updates; PodDisruptionBudget enforces availability
- Database migrations reviewed and tested in staging before production
- Change window for production deployments (Saturday maintenance window)

### Phase 7: Operations & Monitoring

- Alerts configured for error rate spikes, latency increases, authentication failures
- Security events forwarded to Cloud Logging with 7-year retention
- GKE Security Posture dashboard reviewed weekly
- Penetration test annually by external party

### Phase 8: Incident Response

See `docs/compliance/incident-response.md` for the full incident response procedure.

## 3. Third-Party Components

- All new dependencies evaluated for:
  - License compatibility (Apache 2.0, MIT, BSD preferred)
  - Maintenance status (no abandoned projects in critical path)
  - Known vulnerabilities (checked via `govulncheck` + Dependabot)
- Supply chain: SBOM generated at every release and published as a release artifact

## 4. Exceptions

Exceptions to this policy require written approval from the Engineering Manager and Security, with compensating controls documented.
