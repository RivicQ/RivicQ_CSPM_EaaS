# RivicQ CSPM Security Control Matrix

| Domain | Threat | Control | Implementation | Evidence |
|---|---|---|---|---|
| Identity | Credential theft | JWT, RBAC, refresh tokens | `internal/api/shared/auth.go` and auth middleware | Auth logs, token claims, role mapping |
| Multi-tenancy | Tenant breakout | Tenant-scoped queries and claims | Tenant context propagation and DB filters | Audit events, query review |
| CBOM scanning | Tampered scan input | Input validation and sandboxed workers | `internal/discovery` pipeline | Scan logs, hashes, job records |
| GitHub repo scanning | Malicious repo payloads | Token-based GitHub API access and bounded parser logic | `internal/api/shared/github_scanning.go` | Scan requests, repo list responses |
| Quantum attestation | Forged or stale attestation | Provider abstraction, expiry, signed outputs | `internal/quantum/attestation_provider.go` | Attestation records and trace IDs |
| HNDL risk | Long-lived confidentiality loss | PQC migration planner and algorithm aging rules | `internal/quantum/pqc_service.go` | Migration reports and risk scores |
| Secrets | Secret exfiltration | Vault-backed secret access | Secrets manager abstraction | Vault audit logs |
| Encryption | Data exposure in transit/at rest | TLS, HSTS, encrypted storage, HSM-backed keys | Security middleware and integrations | TLS config, KMS/HSM settings |
| Supply chain | Poisoned dependency or image | SCA, SBOM, signed builds, image scan | CI/CD pipeline and release gates | SBOMs, scan reports, signatures |
| Logging | Missing forensic trail | Structured audit logging | `internal/middleware/audit.go` | Audit table rows, log correlation |
| Detection | Late threat discovery | Tracing, metrics, alerts | `internal/middleware/tracing.go` and observability | Trace spans, metrics dashboards |
| Availability | Scan floods / DoS | Rate limiting and worker pools | Rate limit middleware and background jobs | Throttle metrics and queue depth |

## Compliance mappings
- BSI TR-02102: cryptographic strength, algorithm agility, migration planning.
- eIDAS 2.0: evidence integrity, signature assurance, auditability.
- DORA Article 9: ICT resilience, crypto transition planning, monitoring.
- NIST PQC: hybrid migration, FIPS 203/204/205 alignment.
- SOC 2: security, availability, confidentiality, processing integrity.

## Control priorities
1. Remove default OSS auth blockers.
2. Protect cryptographic inventory and long-lived secrets.
3. Harden GitHub repository scanning and webhook intake.
4. Make every scan, risk, and attestation action auditable.
5. Move enterprise workloads to durable jobs and provider-backed trust.