# SOC 2 / ISO 27001 Control Mapping

This document maps CryptoBOM SaaS security controls to SOC 2 Trust Service Criteria (TSC) and ISO 27001:2022 Annex A controls.

> **Status**: Baseline starter — to be reviewed and validated by a qualified auditor before certification.

---

## SOC 2 Trust Service Criteria

### CC1 — Control Environment

| Control ID | Description | CryptoBOM Implementation |
|---|---|---|
| CC1.1 | Board oversight of security | Executive sponsor defined; quarterly security reviews |
| CC1.2 | Independence and oversight | Engineering and Security are separate functions |
| CC1.3 | Organizational structure | RACI matrix maintained in internal wiki |
| CC1.4 | Commitment to competence | Security training tracked via LMS; role-based requirements |
| CC1.5 | Accountability | All employees sign Acceptable Use Policy; CODEOWNERS enforced |

### CC2 — Communication and Information

| Control ID | Description | CryptoBOM Implementation |
|---|---|---|
| CC2.1 | Internal communication | Incident response process documented; Slack #security-alerts channel |
| CC2.2 | External communication | `SECURITY.md` published; vulnerability disclosure policy |
| CC2.3 | Third-party communication | Vendor risk assessments; DPA templates |

### CC6 — Logical and Physical Access

| Control ID | Description | CryptoBOM Implementation |
|---|---|---|
| CC6.1 | Access management | Workload Identity (no static credentials); Secret Manager |
| CC6.2 | Authentication | MFA enforced on all GCP/GitHub accounts |
| CC6.3 | Authorization | RBAC in GKE and GCP; `CODEOWNERS` for code review gates |
| CC6.6 | Threat detection | Cloud Armor, GKE Security Posture, Trivy in CI |
| CC6.7 | Data transmission | TLS 1.3 enforced (`ssl_min_protocol_version = TLSv1.3` in Cloud SQL) |
| CC6.8 | Anti-malware | GKE Binary Authorization; Container Analysis scanning |

### CC7 — System Operations

| Control ID | Description | CryptoBOM Implementation |
|---|---|---|
| CC7.1 | Baseline configuration | Terraform manages all infra; GitOps for K8s manifests |
| CC7.2 | Monitoring | Cloud Monitoring + Prometheus/Grafana; alerting policies |
| CC7.3 | Security events | Cloud Audit Logs → Cloud Logging → long-term GCS archive |
| CC7.4 | Incident response | See `docs/compliance/incident-response.md` |
| CC7.5 | Anomaly detection | Cloud Threat Detection; GKE Security Posture |

### CC8 — Change Management

| Control ID | Description | CryptoBOM Implementation |
|---|---|---|
| CC8.1 | Change authorization | PR reviews required (CODEOWNERS); branch protection on `master` |

### CC9 — Risk Mitigation

| Control ID | Description | CryptoBOM Implementation |
|---|---|---|
| CC9.1 | Risk identification | Annual risk assessment; threat model in `docs/` |
| CC9.2 | Vendor risk | Third-party SCA via Dependency Review action |

---

## ISO 27001:2022 Annex A Control Mapping

### A.5 — Organizational Controls

| Control | Description | Implementation |
|---|---|---|
| A.5.1 | Information security policies | This document; `SECURITY.md`; internal policy wiki |
| A.5.7 | Threat intelligence | CVE feeds; Dependabot; CodeQL |
| A.5.10 | Acceptable use | Acceptable Use Policy; `.github/CODEOWNERS` |
| A.5.23 | Cloud services | Shared Responsibility Matrix for GCP/AWS/IBM |
| A.5.30 | ICT readiness | BCP/DR runbooks; multi-zone GKE; Cloud SQL PITR |

### A.6 — People Controls

| Control | Description | Implementation |
|---|---|---|
| A.6.3 | Security awareness | Annual training; phishing simulations |
| A.6.8 | Reporting incidents | `SECURITY.md`; Slack #security-incidents |

### A.7 — Physical Controls

| Control | Description | Implementation |
|---|---|---|
| A.7.1 | Physical security perimeters | GCP data centres (ISO 27001 certified) |

### A.8 — Technological Controls

| Control | Description | Implementation |
|---|---|---|
| A.8.2 | Privileged access management | Break-glass accounts; audit log review |
| A.8.5 | Secure authentication | Workload Identity; no long-lived service account keys |
| A.8.7 | Malware protection | Artifact Registry scanning; Binary Authorization |
| A.8.8 | Technical vulnerability management | Dependabot; CodeQL; `docs/compliance/vulnerability-management.md` |
| A.8.9 | Configuration management | Terraform; K8s manifests in Git |
| A.8.10 | Information deletion | Data retention policy; automated GCS lifecycle |
| A.8.12 | Data leakage prevention | Network policies; VPC-SC (planned) |
| A.8.15 | Logging | Cloud Audit Logs; App-level structured logging |
| A.8.16 | Monitoring | Cloud Monitoring; Prometheus; uptime checks |
| A.8.24 | Cryptography | AES-256 HSM-backed; TLS 1.3; PQC roadmap |
| A.8.28 | Secure coding | SAST (CodeQL); DAST; peer review |

---

## Certification Status

| Framework | Status | Target Date |
|---|---|---|
| SOC 2 Type I | Not started | Q3 2025 |
| SOC 2 Type II | Not started | Q1 2026 |
| ISO 27001:2022 | Not started | Q4 2025 |
| BSI IT-Grundschutz | Not started | 2026 |
| DORA Compliance | In progress | Q2 2025 |
