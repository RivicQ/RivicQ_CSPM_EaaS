# Five-BOM DevSecOps framework

Honest catalog of **QBOM, AIBOM, SBOM, IBOM, and CBOM** as implemented in RivicQ Security Cloud.
This is not a certification and it does not claim partner APIs without customer credentials.

Companion: [editions.md](editions.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [PRODUCT_STATUS.md](PRODUCT_STATUS.md) · [PQC_MIGRATION.md](PQC_MIGRATION.md) · [ROADMAP.md](ROADMAP.md)

**Live static demo:** [GitHub Pages](https://rivicq.github.io/RivicQ_CSPM_EaaS/) (Community-limited, labeled sample data).

## Layers

| Layer | Role | Community (OSS) | Enterprise |
|---|---|---|---|
| **CBOM** | Cryptographic inventory (algorithms, keys, certs, libraries) | Yes — CycloneDX 1.6 | Same engine |
| **QBOM** | Quantum vulnerability, CRQC urgency, PQC replacement | Yes — local `qiskitprofile` | Same + optional quantum runtime |
| **SBOM** | Software components with a crypto-library flag | Yes — lockfiles / local path | Same + optional Syft/Trivy |
| **AIBOM** | AI/ML provenance, EU AI Act risk tier, serving crypto | Locked (declared inventory only) | Declared registry — **not** a model-weight scanner |
| **IBOM** | Human, machine, and service identities bound to crypto | Secrets still land in CBOM | Directory / NHI connector when a key exists |

The scan report JSON remains `discovery.ScanResult` (`GET /scans/:id/report`). Unified BOM is a **view** over that contract, not a second scanner.

## DevSecOps pipeline (8 stages)

| Stage | Action | Artifact | OSS |
|---|---|---|---|
| 1 Developer IDE | Crypto API lint + secrets scan | Pre-commit violations | Yes |
| 2 Source commit | cdxgen / syft from lock files | SBOM JSON | Yes |
| 3 CI/CD build | `rivicq scan .` unified merge | unified-bom view | Yes |
| 4 Container scan | Optional Trivy/Grype + crypto libs | Container CBOM patch | Yes |
| 5 Staging deploy | TLS/HTTPS + QBOM scoring | CBOM report JSON | Yes |
| 6 Security gate | Policy gate BLOCK / WARN / ALLOW | Pass / block | Yes |
| 7 Production | Continuous EaaS monitoring | Live dashboard | Enterprise |
| 8 Compliance report | DORA / NIS2 / SOC 2 mappings | JSON or pack | Yes (JSON) |

The GitHub Action policy gate is **unchanged**: `BLOCK` fails CI. RSA-2048 is classified, not auto-blocked.

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

## Governance mapping

Community exports JSON mappings. Enterprise enables the evidence **pack flag**. Neither is a certification of RivicQ GmbH.

Mapped frameworks include DORA RTS, NIS2, EU AI Act, EU CRA, US EO 14028, NIST SP 800-207, FIPS 140-3, FIPS 203/204/205, and BSI TR-02102.

## REST (shared `/api/v1`)

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

Edition flags: Community `aibom=false`, `ibom=false`, `hsmConnector=false`, `apiSecurity=true`, `devSecOpsPipeline=true`.
Enterprise enables AIBOM, IBOM, HSM connector, AI security, and the DORA pack flag.

## Console routes (Community-accessible)

Locked Enterprise tiles stay visible; they do not require `RequireEnterprise` except existing paid modules.

| Path | Page |
|---|---|
| `/bom` | Five-BOM intelligence |
| `/pipeline` | Eight-stage pipeline |
| `/security/api` | TLS/HTTPS API surface |
| `/security/ai` | AIBOM (locked on Community) |
| `/connectors/hsm` | HSM + quantum status |
| `/governance` | Control mappings |
| `/migration` | PQC shift roadmap |
