# Roadmap

Prioritized builds after the Community engine, website scan path, and Qiskit-aligned scoring. Day-scale engineering work is described by **subsystem**, not calendar estimates.

See [Product status](PRODUCT_STATUS.md) for what already ships and [Architecture](ARCHITECTURE.md) for layer boundaries.

## Shipped (this line of work)

- Client architecture: public home, Community workspace, Enterprise workspace, admin console
- Auth: login, register, MFA, OAuth, in-memory password reset, workspace roles
- Discovery: TLS, SSH, HTTP**S** websites, SBOM, GitHub content
- Intelligence: normalized findings, crypto risk, policy gate, CycloneDX CBOM
- Five-BOM framework: CBOM, QBOM, SBOM (Community); AIBOM, IBOM (Enterprise)
- DevSecOps pipeline view (stages 1–6 OSS; stage 7 Enterprise); API security from TLS scans
- HSM / quantum status APIs (disconnected without credentials); governance mappings
- Qiskit profile pipeline (local classical taxonomy) wired into intelligence + `/scans/:id/qiskit`
- Honest docs: editions, limitations, Qiskit vs IBM Quantum Runtime

## Build 2 — Enterprise SaaS control plane

1. Tenant isolation on remaining scan/inventory write paths (JWT `tenant_id` already scopes audit/API keys).
2. Scheduled / continuous scanning (UI schedules today are labeled demo placeholders).
3. Live OIDC login; SAML ACS as an operations path with the customer IdP.
4. One high-quality PQC / compliance **report pack** (mappings + evidence export, not certification).
5. Multi-cloud connectors with explicit empty-state copy when credentials are missing.

## Build 3 — Cryptography discovery hardening

1. Stronger application crypto detection (code, containers, TLS/certs) without changing `ScanResult` / CycloneDX contracts.
2. CycloneDX CBOM consistency checks.
3. Practical firmware/hardware ingest: package lists, embedded Linux rootfs, certs in bundles, **declared** HSM/TPM inventory.
4. Long-lived device PQC flags (NIST ML-KEM / ML-DSA / SLH-DSA, BSI-aligned guidance).

**Not on this build:** reverse-engineering closed firmware, extracting keys from secure elements.

## Build 4 — DevSecOps and delivery

1. Harden the GitHub Action policy gate (behavior unchanged unless tests require it).
2. Client-ready CLI docs; first CBOM in 10 minutes (`rivicq scan .`).
3. Keep the dataset accuracy pipeline green (`make analyze-datasets`).
4. Usable air-gapped Helm/Compose path (`docs/DEPLOYMENT.md`).
5. Five-BOM pipeline evidence export (Community JSON; Enterprise pack) — **catalog shipped**; continuous production monitoring remains Enterprise.

## Build 5 — Demo confidence

1. 30-minute customer meeting flow (software estate + optional embedded/industrial artifacts).
2. Internal checklist: what we can demo today vs roadmap.
3. Messaging that does not oversell firmware RE or IBM Quantum hardware.

## Qiskit / quantum (parallel, optional)

| Track | Status |
|---|---|
| Go `qiskitprofile` in intelligence | Shipped |
| Python educational Aer companion | Shipped (`sdk/python/rivicq_qiskit`) |
| IBM Quantum Runtime provider | Enterprise opt-in; unavailable without customer API key |
| Hardware Shor/Grover attacks | Not a product feature |
