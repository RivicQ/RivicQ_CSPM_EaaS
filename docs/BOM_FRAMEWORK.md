# BOM DevSecOps framework

Honest catalog of **CBOM and SBOM** (Community Cryptographic Security Posture Management) plus **QBOM, HBOM, AIBOM, and IBOM** as Enterprise control-plane layers.
This is not a certification and it does not claim partner APIs without customer credentials.

Companion: [editions.md](editions.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [PRODUCT_STATUS.md](PRODUCT_STATUS.md) · [PQC_MIGRATION.md](PQC_MIGRATION.md) · [ROADMAP.md](ROADMAP.md) · [EAAS_API.md](EAAS_API.md)

Scope: this framework describes the **CSPM** scanner and control plane. EaaS is a separate binary and API surface; it does not produce these BOM views and is not a hosted production service.

**Live static demo:** [GitHub Pages](https://rivicq.github.io/RivicQ_CSPM_EaaS/) (Community-limited, labeled sample data).

## Layers

| Layer | Role | Community (OSS) | Enterprise |
|---|---|---|---|
| **CBOM** | Cryptographic inventory (algorithms, keys, certs, libraries) | Yes — CycloneDX 1.6 | Same engine |
| **QBOM** | Quantum vulnerability, CRQC urgency, PQC replacement | Locked — Community still classifies algorithms on CBOM | Licensed QBOM view + optional quantum runtime |
| **SBOM** | Software components with a crypto-library flag | Yes — lockfiles / local path | Same + optional Syft/Trivy |
| **HBOM** | Hardware / HSM / TPM / QSIC declared inventory | Locked | Connector when credentials exist — not firmware RE |
| **AIBOM** | AI/ML provenance, EU AI Act risk tier, serving crypto | Locked | Declared registry — **not** a model-weight scanner |
| **IBOM** | Human, machine, and service identities bound to crypto | Secrets still land in CBOM | Directory / NHI connector when a key exists |

The scan report JSON remains `discovery.ScanResult` (`GET /scans/:id/report`). Unified BOM is a **view** over that contract, not a second scanner.

## DevSecOps pipeline (8 stages)

| Stage | Action | Artifact | OSS |
|---|---|---|---|
| 1 Developer IDE | Crypto API lint + secrets scan | Pre-commit violations | Yes |
| 2 Source commit | cdxgen / syft from lock files | SBOM JSON | Yes |
| 3 CI/CD build | `rivicq scan .` unified merge | unified-bom view | Yes |
| 4 Container scan | Optional Trivy/Grype + crypto libs | Container CBOM patch | Yes |
| 5 Staging deploy | TLS/HTTPS + PQC classification on CBOM | CBOM report JSON | Yes |
| 6 Security gate | Policy gate BLOCK / WARN / ALLOW | Pass / block | Yes |
| 7 Production | Continuous monitoring (CSPM pipeline goal) | Live dashboard | Enterprise (goal; not EaaS) |
| 8 Compliance report | DORA / NIS2 / SOC 2 mappings | JSON or pack | Yes (JSON) |

The GitHub Action policy gate is **unchanged**: `BLOCK` fails CI. RSA-2048 is classified, not auto-blocked. Stage 7 is a pipeline intent, not an implemented EaaS feature: EaaS has no hosted deployment or live dashboard, and its CI has no deploy gate.

## API security and AI security

- **API security (Community):** derived from TLS/HTTPS scans (HSTS, CSP, protocol, certificates). Full API-gateway inventory is Enterprise when a connector exists.
- **AI security:** Community can still scan serving-stack crypto into CBOM. Declared AIBOM is Enterprise.

## HSM and quantum

| Connector | When it connects | Honesty |
|---|---|---|
| Local Qiskit profile | Always | Taxonomy only — not IBM Quantum hardware |
| PKCS#11 / Crypto4A / cloud HSM | Enterprise + `PKCS11_MODULE` or `CRYPTO4A_API_KEY` / cloud IAM | Does not extract keys or reverse-engineer firmware |
| Optional quantum runtime | Enterprise + `IBMQ_API_KEY` | Never required for QBOM scores |
| QSIC | Declared catalog | Research ASIC, not shipped silicon, not a FIPS module of RivicQ |

Partner names in the BOM guide (CryptoNext, Vanta, Okta, Horizon Labs, Rambus, UnoSecur, and others) are **optional connectors**. They are never hard runtime dependencies.

## EaaS is a separate surface

The standalone EaaS build (`cmd/eaas`, `internal/eaas`, `web/eaas`) is not a fifth BOM layer and
does not replace the CSPM engine. It runs on its own default port `:9091`, exposes
`/api/eaas/v1/*` and `/api/beta/v1/*`, and serves its portal from the binary at `/` and `/portal`
rather than GitHub Pages. It uses a file-backed sandbox store; there is no Go Postgres repository.

- Classical operations (AES-256-GCM, HMAC-SHA-256, SHA-256, `crypto/rand`) are implemented as
  `Beta implemented`; ML-KEM-768 and ML-DSA-65 are `Experimental` via `cloudflare/circl` and are
  not FIPS/CAVP validated. SLH-DSA is not implemented.
- EaaS enforces numeric monthly quotas and RPM limits. Plan flags for SSO, HSM, audit log, and
  advanced analytics are display-only, and there is no Stripe/payment collection, payment
  webhooks, or email delivery.
- No hosted deployment, HSM/KMS custody, AI operations, quantum hardware, or wireless operations
  exist in EaaS. See [EAAS_PRODUCT_STATUS.md](EAAS_PRODUCT_STATUS.md) and
  [EAAS_LIMITATIONS.md](EAAS_LIMITATIONS.md).

## Governance mapping

Community exports JSON mappings. Enterprise enables the evidence **pack flag**. Neither is a certification of RivicQ GmbH.

Mapped frameworks include DORA RTS, NIS2, EU AI Act, EU CRA, US EO 14028, NIST SP 800-207, FIPS 140-3, FIPS 203/204/205, and BSI TR-02102.

## REST (shared CSPM `/api/v1`)

These are CSPM paths. EaaS uses `/api/eaas/v1/*` and `/api/beta/v1/*` on a separate router; see
[EAAS_API.md](EAAS_API.md).

```
GET /bom/framework
GET /bom/pipeline
GET /bom/unified[?scan_id=]
GET /governance/controls
GET /hsm/status
GET /quantum/status
GET /security/api
GET /security/ai
```

Edition flags: Community `qbom=false`, `hbom=false`, `aibom=false`, `ibom=false`, `hsmConnector=false`, `apiSecurity=true`, `devSecOpsPipeline=true`.
Enterprise enables QBOM, HBOM, AIBOM, IBOM, HSM connector, AI security, and the DORA pack flag.

## Console routes

`/security/ai` and `/connectors/hsm` require the Enterprise edition (UI lock + API 403 on Community).

| Path | Page |
|---|---|
| `/bom` | CBOM · SBOM intelligence (Enterprise layers locked) |
| `/pipeline` | Eight-stage pipeline |
| `/security/api` | TLS/HTTPS API surface |
| `/security/ai` | AIBOM (Enterprise) |
| `/connectors/hsm` | HSM + quantum status |
| `/governance` | Control mappings |
| `/migration` | PQC shift roadmap |
