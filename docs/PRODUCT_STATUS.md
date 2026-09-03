# Product status — Community to Enterprise

Honest snapshot of what RivicQ ships today for operators who need **open-source scanning**, **enterprise control-plane audits**, and **scores**. This is not a certification.

**Live static demo:** [GitHub Pages](https://rivicq.github.io/RivicQ_CSPM_EaaS/) (labeled sample data; no production API).

Companion docs: [Roadmap](ROADMAP.md) · [Qiskit pipeline](QISKIT_PIPELINE.md) · [Architecture](ARCHITECTURE.md) · [Editions](editions.md) · [Known limitations](KNOWN_LIMITATIONS.md)

## What is complete

The **cryptographic intelligence engine is shared**. Community (`:8080`) and Enterprise (`:9090`) run the same discovery, intelligence, Qiskit-aligned scoring, and CycloneDX CBOM export. Enterprise adds the licensed control plane (SSO config, audit viewer, API keys, webhooks, multi-cloud connectors) — not a second scanner.

| Layer | Community (OSS) | Enterprise |
|---|---|---|
| TLS / SSH / HTTP(S) / SBOM discovery | Yes | Same engine |
| Website scan (`scan_type=website` or `https://…`) | TLS + HTTPS headers/cookies; SSH skipped | Same |
| GitHub content scan | Yes (authorized) | Same |
| Policy gate (BLOCK / WARN / ALLOW) | Yes | Same |
| Qiskit-aligned estate score | Local taxonomy (`qiskitprofile`) | Same + optional IBM Quantum **connector** (API key, not required) |
| Audit score | Policy gate + Qiskit estate (mappings) | Same score + control-plane evidence when configured |
| CycloneDX 1.6 CBOM | `GET /scans/:id/cyclonedx` | Same JSON |
| Auth (login, register, MFA, OAuth) | Yes | + SSO **config**, RBAC on mutating routes |
| Admin console | Users/roles if authenticated | + audit, API keys, webhooks |
| Compliance PDFs / packs | Control mappings in UI | Same honesty: **not ISO/SOC/NIST certification** |
| Multi-cloud inventory | No | Yes when credentials exist (empty otherwise) |

## Scores — what they mean

| Score | Source | Honest meaning |
|---|---|---|
| **Qiskit estate (0–100)** | `internal/quantum/qiskitprofile` via `GET /scans/:id/qiskit` | Shor / Grover / NIST PQC **taxonomy**. Not a qubit measurement. IBM Quantum Runtime is **not** invoked. |
| **Audit overall (0–100)** | Intelligence `audit_score` | Estate score minus policy-gate penalty. **Not** an auditor opinion. |
| **Policy gate** | `internal/intelligence` | BLOCK / WARN / ALLOW on weak RSA, MD5/SHA-1, TLS &lt; 1.2, KEV, secrets. |
| **PQC readiness** | CBOM component flags + Qiskit `pqc` class | ML-KEM / ML-DSA / SLH-DSA (FIPS 203/204/205) classified, not validated on a NIST CAVP lab. |
| **Cloud posture / CIS / ISO tiles** | Enterprise UI mappings | Operator mappings. Do not present as RivicQ being certified. |

RSA-2048 is **classified** (Shor family), not automatically marked vulnerable.

## Website scanning (client)

1. Scanner page defaults to `https://example.com` with scan type **website**.
2. Home page accepts a GitHub repo **or** a website URL.
3. `POST /api/v1/scans` with `scan_type=website` (or any `https://` / `www.` target on `cbom`) schedules:
   - **TLS** on 443 (or the URL port)
   - **HTTPS** header/cookie detection on the same port (`Scheme=https`)
   - **SSH skipped** unless `scan_type=full`
4. Status JSON includes `targets`, `resources` (`tls` / `https` / `http` / `ssh` / `sbom`), and `finding_items`.
5. After completion the client loads intelligence + Qiskit scores and shows enabled resources.

GitHub Pages cannot run this path (no API). Use `make dev-backend` or the Enterprise binary, then the React app.

## APIs for scores and evidence

```
POST /api/v1/scans
GET  /api/v1/scans/:id                 # status, findings, targets, resources
GET  /api/v1/scans/:id/report          # discovery.ScanResult (do not break)
GET  /api/v1/scans/:id/intelligence    # findings + gate + qiskit + audit_score
GET  /api/v1/scans/:id/qiskit          # Qiskit pipeline + audit_score + resources
GET  /api/v1/scans/:id/cyclonedx
```

## Not complete (see roadmap)

- Tenant isolation on remaining scan write paths
- Scheduled / continuous scans
- Live OIDC / SAML ACS login (config store exists)
- Mailbox-backed password reset (in-memory tokens today)
- Firmware reverse-engineering (not claimed; Build 3 is package/rootfs/cert ingest)
- IBM Quantum hardware runs as a requirement for scoring (never)

## How to demo a full website result

```bash
# Community
go run ./cmd/server/oss
# Client (separate terminal)
cd web && npm start
# Scan https://example.com from Scanner, or:
curl -sS -X POST http://127.0.0.1:8080/api/v1/scans \
  -H 'Content-Type: application/json' \
  -d '{"target":"https://example.com","scan_type":"website"}'
```

Poll `GET /api/v1/scans/:id` until `status=completed`, then `GET /api/v1/scans/:id/qiskit`.
