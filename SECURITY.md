# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x (enterprise-mvp) | ✅ Yes |
| 0.1.x | ❌ No (EOL) |

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues to: **security@rivicq.com** (or open a private GitHub Security Advisory).

We aim to acknowledge reports within **48 hours** and provide a remediation timeline within **7 business days**.

---

## Security Controls Implemented

### CI/CD Pipeline

| Control | Tool | Trigger |
|---------|------|---------|
| Static Application Security Testing (SAST) | `gosec` (non-blocking, SARIF upload) | Every push & PR |
| Dependency vulnerability review | GitHub Dependency Review | Every PR |
| Container filesystem scan | Trivy | Every push to main |
| Container image scan | Trivy | Post-push (non-PR) |
| Code QL (Go, JavaScript) | GitHub CodeQL | Every push & PR |
| SBOM generation | Syft → CycloneDX JSON | Every release tag |
| Lint | `golangci-lint` | Every push & PR |
| Go vulnerability check | `govulncheck` | Every push |

### Runtime Security

| Control | Detail |
|---------|--------|
| TLS version | TLS 1.2 minimum enforced at Cloud Armor WAF and Ingress |
| JWT authentication | HMAC-SHA256 signed; configurable expiry |
| Non-root containers | UID 65534 (`nobody`), `runAsNonRoot: true` |
| Read-only root filesystem | `readOnlyRootFilesystem: true` |
| Network policies | Deny-all default; allow-listed ingress/egress only |
| Secrets management | GCP Secret Manager; never stored in ConfigMaps or env literals |
| CMEK | Cloud KMS CMEK for Cloud SQL and GCS |
| HSM-backed keys | IBM HPCS or AWS CloudHSM (optional integration) |
| Audit logging | Structured JSON to Cloud Logging; query with `jsonPayload.level="error"` |

### Cryptographic Posture

CryptoBOM SaaS **discovers and reports** cryptographic assets.  
It does not itself implement custom cryptography — all crypto is provided by:

- **Go standard library** (`crypto/tls`, `crypto/aes`, `crypto/sha256`, etc.)
- **`golang.org/x/crypto`** for additional primitives
- **Cloud KMS / HSM** for key operations in production

**Quantum safety:** Quantum attestation is provided at a **detection + roadmap** level.  
It identifies algorithms that are quantum-vulnerable (RSA, ECDSA, DH) and provides  
migration guidance to NIST PQC candidates (ML-KEM, ML-DSA, SLH-DSA).  
It is **not** a certified PQC audit and does not guarantee post-quantum protection.

### Known Limitations / Open Issues

- `gosec` findings are reported as SARIF advisories but do not block CI (non-blocking mode).  
  Address all HIGH/CRITICAL findings before production deployment.
- Go standard library is **not** FIPS 140-3 validated by default.  
  Use a FIPS-enabled Go toolchain (e.g., RedHat's Go FIPS fork) for air-gapped / FIPS environments.
- IBM HPCS and AWS CloudHSM require customer-managed credentials; these are never committed to the repo.

---

## Compliance Alignment

| Framework | Coverage |
|-----------|---------|
| BSI TR-02102 | Algorithm inventory, weak-cipher detection, migration guidance |
| eIDAS 2.0 | Qualified electronic signatures, certificate lifecycle tracking |
| DORA (EU) | Crypto asset inventory for ICT risk management |
| FIPS 140-3 | HSM-backed key operations (IBM HPCS / AWS CloudHSM) |
| NIST PQC | Quantum-vulnerable algorithm detection, PQC migration plans |
| ISO 27001 | A.10 Cryptography controls, A.12.6 Vulnerability management |

---

## Dependency Management

Dependencies are pinned in `go.sum` and `web/package-lock.json`.  
Automated updates via GitHub Dependabot (configured separately).  
Dependency review runs on every PR via GitHub Advanced Security.
