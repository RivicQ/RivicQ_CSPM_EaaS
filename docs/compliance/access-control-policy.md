# Access Control Policy

**Effective Date**: 2024-01-01  
**Owner**: Engineering / Security  
**Review Cycle**: Annual

---

## 1. Principles

CryptoBOM enforces access control based on:
- **Least privilege**: every identity (human or service) receives the minimum permissions required
- **Need-to-know**: access granted only for explicit business need, with documented justification
- **Separation of duties**: production access requires separate approval from dev access
- **Zero standing access**: privileged production access uses just-in-time (JIT) elevation with time-boxed sessions

## 2. Identity and Access Management

### GCP IAM

| Role | Description | Who |
|---|---|---|
| `roles/owner` | Full project admin | Break-glass account only (audited) |
| `roles/editor` | Broad write access | **Not used** (too broad) |
| `roles/container.developer` | Deploy to GKE | CI/CD service account (`deploy-sa`) |
| `roles/cloudsql.client` | Connect to Cloud SQL | App SA + DBA team |
| `roles/secretmanager.secretAccessor` | Read secrets | App SA (Workload Identity) |
| `roles/cloudkms.cryptoKeyEncrypterDecrypter` | KMS encrypt/decrypt | App SA (Workload Identity) |
| `roles/logging.logWriter` | Write logs | App SA |
| `roles/monitoring.metricWriter` | Write metrics | App SA |

### Kubernetes RBAC

| ClusterRole | Subjects | Scope |
|---|---|---|
| `cluster-admin` | Emergency break-glass SA only | Cluster |
| `edit` | CI/CD pipeline SA | `cryptobom-system` namespace |
| `view` | Monitoring SA | All namespaces |
| (custom) `cryptobom-app` | `cryptobom-sa` | `cryptobom-system` — app-specific verbs only |

### GitHub Repository

| Permission | Who |
|---|---|
| Admin | Repository owner only |
| Maintain | Lead engineers (requires 2FA + verified identity) |
| Write | All engineers (PR-only; direct push to `master` disabled) |
| Read | Public (OSS) / scoped (enterprise) |

Branch protection on `master`:
- Required reviewers: 1 (CODEOWNERS)
- Required status checks: CI, security scan, Terraform validate
- No force push; no deletion

## 3. Service Account Key Policy

- **No long-lived service account keys** are created or stored
- All GKE workload authentication uses **Workload Identity** (token exchange, no key files)
- CI/CD uses **Workload Identity Federation** (GitHub OIDC → GCP SA token, no key files)
- Emergency break-glass keys (if needed) are stored in a hardware-backed secrets vault, not in source control

## 4. Secret Management

All application secrets are stored in **GCP Secret Manager**:
- Secrets are never committed to source control
- Secrets are accessed at runtime via Workload Identity (no environment variable injection from files)
- Secret versions are rotated on a defined schedule (quarterly for API keys; 90 days for DB passwords)
- All secret access is logged to Cloud Audit Logs

## 5. Access Reviews

| Review Type | Frequency | Owner |
|---|---|---|
| GCP IAM bindings | Quarterly | Platform Engineering |
| GKE RBAC | Quarterly | Platform Engineering |
| GitHub access | Quarterly | Engineering Manager |
| Service account inventory | Quarterly | Security |
| Third-party integrations | Semi-annual | Security |

## 6. Privileged Access (Production)

Production GKE cluster and Cloud SQL access for humans requires:
1. Ticket/change request with business justification
2. Approval from team lead
3. JIT access granted (time-boxed ≤4 hours)
4. All commands logged (Cloud Audit Logs + terminal recording for DB access)
5. Access automatically revoked after session or time limit

## 7. Offboarding

Upon employee departure or role change:
- GCP IAM bindings removed within 1 business day
- GitHub org membership updated within 1 business day
- CODEOWNERS file updated if applicable
- API keys and tokens revoked within 4 hours of HR notification
