# Quantum Security Fabric (FABRIC)

Original product identity for a unified enterprise security graph. **Not** a reskin of the Community console, and **not** a certification of this repository or of any customer.

Live labeled demo (GitHub Pages): https://rivicq.github.io/RivicQ_CSPM_EaaS/fabric/

Source: [`fabric/`](../fabric/) · [fabric/README.md](../fabric/README.md)

**FABRIC** · Quantum Security Fabric  
Tagline: *See every asset. Understand every risk. Secure what comes next.*

The product proposition is **unified security graph + CSPM + BOM intelligence + CryptoBOM + quantum readiness + compliance + gated AI remediation**. A cloud misconfiguration is connected to the workload, identity, application, dependency, cryptographic asset, certificate, data, regulation, and business impact.

## Graphs

Every operational surface has a focused subgraph of the Northbridge fixture — not one unfiltered estate drawing:

| Surface | Graph |
|---------|--------|
| Discovery | Progressive inventory: each stage reveals nodes |
| Detections (`QSF-*`) | One subgraph per finding |
| Attack surface | One subgraph per kill-chain stage, plus full blast radius |
| Assets, cloud, identity, workloads, Kubernetes | One subgraph per selected object |
| CryptoBOM, certificates, secrets, PQC | Cryptographic dependence graphs (magenta) |
| SBOM / HBOM / IBOM / AIBOM | Supply-chain, hardware, infrastructure, and model graphs |
| Command, posture, compliance, analyst | Risk, drill, control, and attack-path graphs |

Red edges are attack path. Magenta edges are cryptographic. Control mappings on those graphs are **not** certifications.

## What is public

- Synthetic “Northbridge Exchange” fixture only.
- Secret **names** and statuses. Never values, private keys, or tokens.
- Control **mappings** (NIST, ISO, SOC 2, PCI, GDPR, DORA, NIS2, BSI, CIS, FIPS). Not audits or certifications of Quantum Security Fabric or of RivicQ GmbH.
- PQC algorithms (ML-KEM, ML-DSA, SLH-DSA) as NIST-standardized concepts. No claim of completed migration.
- Checkout UI with payment **disabled**.
- Command palette, executive / engineering / auditor modes, and CSV/TXT exports of fixture tables.

## What is not in Community / Pages

- Live cloud, cluster, IdP, or vault attach
- Customer inventories
- Payment capture
- Domain-admin mailboxes or bootstrap logins
- Unpublished Enterprise connectors
- Silent destructive remediation

Enterprise rights are licensed separately. See [LEGAL.md](../LEGAL.md) and [editions.md](editions.md).

Do not open issues or pull requests that contain customer hostnames, secrets, or production telemetry. See [PRIVACY.md](../PRIVACY.md) and [DATASETS.md](../DATASETS.md).

## Visual language

Obsidian surfaces, Public Sans + Source Code Pro, semantic color (emerald / cyan / violet / amber / red / magenta). Distinct graph node shapes. Glow only for AI, threats, PQC, and active graph nodes. This identity is separate from the Community Security Cloud chrome.
