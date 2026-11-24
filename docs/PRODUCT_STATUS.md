# Product status — Community to Enterprise

Honest snapshot of what RivicQ ships today for operators who need **open-source scanning**, **enterprise control-plane audits**, and **scores**. This is not a certification.

> Current status: PARTIALLY IMPLEMENTED — controlled pilot ready for static cryptographic inventory; production Enterprise remains BLOCKED BY EXTERNAL CONFIGURATION. Next: validate the buyer, trigger, and authorized source tree with five security-leader interviews by 2026-11-24, then ship the workflow, console, scanner, evidence, security, accessibility, and release-readiness roadmap.

**Scope:** everything in the Community/Enterprise tables, scores, demo, and API lists on this page describes the **CSPM product only**. The standalone EaaS build on `main` is a separate product surface, documented in [EaaS below](#eaas--standalone-product-surface-not-cspm); it is not production-ready, is not hosted, and is excluded from the CSPM scores and pilot/production claims.

**Live static demo:** [GitHub Pages](https://rivicq.github.io/RivicQ_CSPM_EaaS/) (labeled sample data; no production API). The EaaS portal is served by the EaaS binary, not GitHub Pages.

Companion docs: [Core engine](CORE_ENGINE.md) · [Roadmap](ROADMAP.md) · [Qiskit pipeline](QISKIT_PIPELINE.md) · [Architecture](ARCHITECTURE.md) · [Client architecture](CLIENT_ARCHITECTURE.md) · [BOM layers](BOM_FRAMEWORK.md) · [Editions](editions.md) · [Known limitations](KNOWN_LIMITATIONS.md) · [Optional scanners](INTEGRATIONS.md)

EaaS docs: [Product status](EAAS_PRODUCT_STATUS.md) · [API](EAAS_API.md) · [Deployment](EAAS_DEPLOYMENT.md) · [Security & privacy](EAAS_SECURITY_PRIVACY.md) · [Limitations](EAAS_LIMITATIONS.md) · [Testing & CI](EAAS_TESTING_CI.md) · [Freemium & metering](EAAS_FREEMIUM_AND_METERING.md)

## What is complete

The **cryptographic intelligence engine is shared**. Community (`:8080`) and Enterprise (`:9090`) run the same discovery, intelligence, Qiskit-aligned scoring, and CycloneDX CBOM export. Enterprise adds the licensed control plane (SSO config, audit viewer, API keys, webhooks, multi-cloud connectors) — not a second scanner.

| Layer | Community (OSS, limited) | Enterprise |
|---|---|---|
| TLS / SSH / HTTP(S) / SBOM discovery | Yes | Same engine |
| QBOM / HBOM / AIBOM / IBOM | Locked (Enterprise; APIs 403) | Licensed control-plane layers |
| CBOM / SBOM CSPM | Yes | Same engine |
| API security (TLS/HTTPS surface) | Yes | Same + gateway inventory when connected |
| DevSecOps pipeline | Stages 1–6 + JSON (stage 8) | Stage 7 continuous monitoring |
| HSM / PKCS#11 | Declared QSIC/HSM catalog | Connector when `PKCS11_MODULE` or cloud IAM exists |
| Website / host / IP / server | Yes | Same |
| Kubernetes pod | Declared inventory (`pod://ns/name`) | Same + live attach when a credential exists |
| Hardware / QSIC | Declared catalog | Persistable inventory; still not firmware RE |
| GitHub content scan | Yes (authorized) | Same |
| Policy gate (BLOCK / WARN / ALLOW) | Yes | Same |
| Optional PATH scanners | Syft / Trivy / Grype / Gitleaks / OSV when installed | Same |
| Qiskit-aligned estate score | Local taxonomy (`qiskitprofile`) | Same + optional quantum **connector** (API key, not required) |
| DORA pack | JSON mappings | Pack flag enabled (still not a certification) |
| Multi-cloud inventory | No | Yes when credentials exist (empty otherwise) |
| Tenant isolation | JWT on scans/inventory; anonymous → public tenant | Same + control-plane APIs; `X-Tenant-ID` ignored |

## Scores — what they mean

These scores cover CSPM only. EaaS operations, keys, usage, and portal activity do not feed into any of them.

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
GET  /api/v1/bom/framework
GET  /api/v1/bom/pipeline
GET  /api/v1/bom/unified
GET  /api/v1/governance/controls
GET  /api/v1/hsm/status              # 403 on Community
GET  /api/v1/quantum/status          # local taxonomy stays Community
GET  /api/v1/security/api
GET  /api/v1/security/ai             # 403 on Community
GET  /api/v1/scans/:id/qbom          # 403 on Community
```

## EaaS — standalone product surface (not CSPM)

Separate binary and API on `main`; evidence: `cmd/eaas/main.go`, `internal/eaas/`, `web/eaas/index.html`, `deploy/migrations/004_eaas_schema.sql`, `.github/workflows/eaas-ci.yml`. Status labels: `VERIFIED` (local implementation), `LIMITED` (sandbox boundary), `PARTIALLY_IMPLEMENTED`, `NOT_IMPLEMENTED`, `BLOCKED`, `Experimental`, `Integration pending`.

| Capability | Status | Honest boundary / evidence |
|---|---|---|
| Standalone service and API on `:9091`; `/healthz`, `/api/eaas/v1/*`, `/api/beta/v1/*` | VERIFIED | `cmd/eaas/main.go`, `internal/eaas/http.go`; independent of the CSPM `:8080`/`:9090` APIs |
| Developer portal at `/` and `/portal` | VERIFIED | `web/eaas/index.html`, `cmd/eaas/main.go:34-37`; served by the binary, not GitHub Pages |
| Account/session lifecycle, bcrypt passwords, hashed bearer sessions | VERIFIED (local) | `internal/eaas/service.go:107-292`; verification-code email delivery Integration pending |
| Projects and API keys: hashed, shown once, rotate/revoke, tenant-scoped | VERIFIED (local) | `internal/eaas/service.go:330-500`; `internal/eaas/eaas_test.go:323-348` |
| Classical operations (AES-256-GCM, HMAC-SHA-256, SHA-256, `crypto/rand`) | VERIFIED (local; Beta implemented in responses) | `internal/eaas/crypto.go`; Go standard library, no CAVP/FIPS validation |
| ML-KEM-768 / ML-DSA-65 via `github.com/cloudflare/circl` v1.6.1 | Experimental | `internal/eaas/crypto.go`, `go.mod`; SLH-DSA not implemented |
| Server-held keys: public keys returned, private bytes never returned | LIMITED | `internal/eaas/service.go`, `internal/eaas/store.go`; private bytes are base64 in the sandbox JSON state file, not HSM custody |
| Free plan = 10,000 operations/month and 60 RPM; numeric enforcement | VERIFIED (local) | `internal/eaas/plans.go`, `internal/eaas/service.go`; `internal/eaas/eaas_test.go:350-392` |
| Self-service plan switch | PARTIALLY_IMPLEMENTED | `internal/eaas/service.go`; changes entitlements only — no Stripe or payment collection |
| Metadata-only usage events | VERIFIED (local) | `internal/eaas/store.go:91-105`, `internal/eaas/service.go:754-829`; no payloads, keys, or secrets in events |
| Beta registration `POST /api/beta/v1/registrations` → `received_pending_review`; admin review via `EAAS_ADMIN_TOKEN` | VERIFIED (local); LIMITED (manual review) | `internal/eaas/service.go:880-943`, `internal/eaas/http.go:62-66` |
| Strict CORS allowlist and tenant isolation | VERIFIED (local) | `internal/eaas/http.go:80-102`, `internal/eaas/eaas_test.go:323-348,478-492` |
| Hosted EaaS, payments/payment webhooks, email delivery, production Postgres repository | NOT_IMPLEMENTED / BLOCKED | `deploy/migrations/004_eaas_schema.sql` is a target schema only; no host, repository, mailer, or payment adapter in evidence scope |
| CAVP/FIPS validation, AI operations, quantum hardware, HSM custody, wireless operations | NOT_IMPLEMENTED | No implementation in `internal/eaas/`; see `docs/EAAS_LIMITATIONS.md` |

Seven EaaS package tests passed locally, including the end-to-end journey, tenant isolation, quota/RPM, beta review, secrets-not-persisted, classical crypto, and strict CORS cases (`internal/eaas/eaas_test.go`). The full repository `go test ./...` suite, `go vet ./...`, and `go build ./...` passed locally after the EaaS addition (`docs/EAAS_TESTING_CI.md`).

## Not complete (see roadmap)

- Scheduled / continuous scans (CSPM only)
- Live OIDC / SAML ACS login (config store exists; CSPM only)
- Mailbox-backed password reset (in-memory tokens today; CSPM only)
- Firmware reverse-engineering (not claimed; Build 3 is package/rootfs/cert ingest)
- IBM Quantum hardware runs as a requirement for scoring (never)
- EaaS hosted deployment, payments, email delivery, production Postgres, CAVP/FIPS, AI/quantum-hardware/HSM/wireless operations (see [EaaS above](#eaas--standalone-product-surface-not-cspm))

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

## Public website routes (React, GitHub Pages)

These routes are unauthenticated marketing pages on the same nebula chrome as Home and are published on github.io.

| Path | Page |
|---|---|
| `/` | Home — assessment hero + public scan |
| `/product` | Product |
| `/product/cspm` | CSPM (does not replace console `/cspm`) |
| `/cbom` | CBOM |
| `/pqc` | Post-quantum |
| `/enterprise` | Enterprise |
| `/security` | Security (does not replace console `/security/api`) |
| `/pricing` | List prices — checkout is not live |
| `/request-demo` | Lead form or `mailto:sales@rivicq.com` on Pages |
| `/ibm` | IBM Partner Plus readiness (no IBM APIs) |
| `/contact` | Five public desks |
| `/fabric` | RivicQ Graph labeled demo (formerly NEXUS / FABRIC) |

