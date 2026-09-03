# RivicQ CryptoBOM — Enterprise SaaS architecture

Honest product architecture for operators, evaluators, and customer conversations.
This is not a certification, and it does not claim firmware reverse-engineering.

**Live static demo:** [GitHub Pages](https://rivicq.github.io/RivicQ_CSPM_EaaS/) (labeled sample data only).

## Core SaaS layers

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Client architecture                                      │
│    Public marketing + free scan                             │
│    Authenticated Community workspace                        │
│    Authenticated Enterprise workspace                       │
│    Command Center (dashboard) as operational home           │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST + JWT
┌──────────────────────────▼──────────────────────────────────┐
│ 2. Data / intelligence plane (shared engine)                │
│    Discovery → normalize → risk → policy → Qiskit scores    │
│    CycloneDX CBOM export (+ SBOM correlation where present) │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌─────────────────────┐
│ 3. Control    │  │ 4. Delivery   │  │ 5. Hardware/firmware│
│    plane      │  │    plane      │  │    extension        │
│  (Enterprise) │  │               │  │    (practical)      │
└───────────────┘  └───────────────┘  └─────────────────────┘
```

### 1. Client architecture

| Surface | Who | Home |
|---|---|---|
| Public | Anonymous | Marketing home, free/local scan path, labeled Interactive Demo |
| Community | Authenticated OSS | Command Center, Scanner, Assets, Analytics, Settings |
| Enterprise | Authenticated paid workspace | Community surfaces + inventory, compliance, multi-cloud, quantum, admin |

Fast path: visit → Demo or Register → Command Center → first CBOM in the scanner (CLI: `rivicq scan .`).

Editions: **Community** (Apache-2.0), **Professional**, **Enterprise** (commercial control plane). UI edition preference is client-selected; license enforcement belongs on the Enterprise binary (`CRYPTOBOM_LICENSE_KEY`).

### 2. Data / intelligence plane (do not break)

Shared by Community and Enterprise:

- `internal/discovery` — TLS, SSH, HTTP(S) websites, SBOM/package cryptographic discovery
- `internal/intelligence` — normalized findings, crypto risk, policy gate, Qiskit profile, audit score
- CycloneDX CBOM via `/scans/:id/cyclonedx` and the intelligence pipeline
- Qiskit pipeline via `/scans/:id/qiskit` (local taxonomy; not IBM Quantum hardware)
- Scan report JSON is `discovery.ScanResult` (`GetCBOMScanReport`)

Do not change those contracts for UI or auth work.

### 3. Control plane (Enterprise)

Shipped or in progress:

| Capability | Today | Honest boundary |
|---|---|---|
| Multi-tenancy | JWT `tenant_id`; inventory/audit/API keys scoped to claim | Scan APIs are not fully tenant-isolated yet (Build 2) |
| RBAC | Viewer < Analyst < Operator < Admin (`RequireRole`) | Enforced on mutating SSO, cloud connectors, API keys, webhooks, workspace role changes |
| Auth | Login, register, JWT refresh, TOTP MFA, Google/GitHub OAuth | Password reset is in-memory; no mailbox product |
| SSO | `POST /sso/saml` and `/sso/ldap` store config | No live SAML ACS / OIDC login handshake yet |
| Audit | `GET /audit/events` (JWT tenant) | Empty when Enterprise DB is unavailable |
| MFA | Setup / confirm / disable / login challenge | TOTP only |
| Scheduled scans | Not implemented | Build 2 |
| Multi-cloud | Connector APIs + graceful empty inventory | Needs real credentials |
| Compliance pack | Control mappings in UI | Mappings, not certifications |

### 4. Delivery plane

- CLI: `cmd/rivicq` (`rivicq scan .`)
- REST: `/api/v1`
- Dashboard: React Command Center
- GitHub Action policy gate (do not change the gate contract)
- Air-gapped: Helm/Compose documented in `docs/DEPLOYMENT.md`

### 5. Hardware / firmware extension (practical scope)

**Supported or implementable without reverse-engineering closed firmware:**

- Firmware package / image **metadata**
- Embedded Linux **rootfs / package inventories**
- Static **binary/library indicators** where analysis is feasible
- Certificates and crypto config found in firmware **bundles**
- **Declared** inventory of keys/certs for SE / HSM / TPM (connectors or operator-supplied)
- Algorithms declared or detected in device **software stacks**
- PQC risk flags for long-lived devices (NIST ML-KEM, ML-DSA, SLH-DSA; BSI-aligned guidance)
- Hybrid (classical + PQC) posture as a recommendation, not a runtime protocol engine

**Not claimed today:**

- Automated reverse-engineering of arbitrary closed firmware images
- Extracting keys from secure elements
- Full MCU flash dump analysis as a product feature

`POST /inventory/hardware/discover` is a stub that acknowledges a job; it is not a firmware RE engine.

## Community vs Enterprise

| | Community | Enterprise |
|---|---|---|
| License | Apache-2.0 | Commercial |
| Engine | Full CBOM discovery + CycloneDX | Same engine |
| Auth | Login, register, MFA, OAuth | + SSO config, audit, API keys, webhooks |
| Workspaces | Single-tenant OSS default | JWT tenant isolation on control-plane APIs |
| Demo on Pages | Labeled client session (`rivicq-demo-session`) | Same demo label; not a customer tenant |

## Current honest capability boundaries

- GitHub Pages has **no production API**. Demo Access there is an isolated client marker, not a JWT.
- Cloud inventory without credentials is empty, not simulated as a customer estate (except the labeled demo).
- Compliance dashboards are **control mappings**, not ISO/SOC/NIST certifications.
- IBM, IBM Plex, and Carbon are trademarks of IBM. RivicQ is not an IBM product.
- Firmware/hardware crypto visibility is inventory + static/package/config + connectors.

## Prioritized builds

Full list: [ROADMAP.md](ROADMAP.md). Product snapshot: [PRODUCT_STATUS.md](PRODUCT_STATUS.md). Qiskit wiring: [QISKIT_PIPELINE.md](QISKIT_PIPELINE.md).

### Build 1 — Client architecture + auth + admin (this delivery)

1. Finalize login / register / edition selection (Community, Professional, Enterprise).
2. Command Center as operational home; strong empty states.
3. Complete authentication: login, signup, MFA enroll/confirm/disable, forgot/reset password, profile, change password.
4. Admin console: workspace users/roles, audit viewer, API keys, webhooks, SSO **config** (not live IdP login).
5. Persist theme; enterprise-ready sky-blue/white UI; labeled demo only.
6. Website HTTPS detection (TLS + headers/cookies; SSH skipped unless `full`) and Qiskit-aligned scores in the client.

### Build 2 — Enterprise SaaS control plane

1. Tenant isolation on remaining scan/inventory write paths.
2. Scheduled / continuous scanning.
3. Live OIDC login; SAML ACS as an operations path.
4. One high-quality PQC / compliance report pack (mappings, not certification).
5. Multi-cloud connectors with explicit degradation copy.

### Build 3 — Cryptography discovery hardening

1. Stronger app crypto detection (code, containers, TLS/certs) without changing export contracts.
2. CycloneDX CBOM consistency checks.
3. Practical firmware/hardware ingest paths (packages, rootfs, certs, declared HSM/TPM).
4. PQC scoring + migration recommendations for long-lived devices.

### Build 4 — DevSecOps and delivery

1. Harden GitHub Action policy gate (behavior unchanged unless tests require it).
2. Client-ready CLI docs; first CBOM in 10 minutes.
3. Keep dataset accuracy pipeline green.
4. Usable air-gapped Helm/Compose path.

### Build 5 — Demo confidence

1. 30-minute customer meeting flow (software + embedded/industrial).
2. Internal checklist: what we can demo today vs roadmap.
3. Messaging that does not oversell firmware RE.

## Hardware / firmware task list (Build 3+)

1. Ingest firmware SBOM / package lists into the existing discovery normalizer.
2. Parse certificate and key material from uploaded bundles (PEM/DER/JKS where practical).
3. Declared hardware-anchor inventory (TPM/HSM/SE) with CBOM component classification.
4. Long-lifetime PQC flagging (algorithm + device longevity), NIST/BSI guidance text.
5. Document supported artifact types vs roadmap in-product (no RE claims).
