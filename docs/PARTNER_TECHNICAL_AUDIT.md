# RivicQ × Infineon / G+D — Technical Audit & Implementation Plan

Status date: 2026-10-11
Repo: `RivicQ/RivicQ_CSPM_EaaS` (module `github.com/rivic-q/cryptobom-saas`)
Audited revision: branch `cursor/cspm-enterprise-boms-86cc` (baseline `go build ./...` = PASS; Go 1.26.9)

This document is the pre-implementation audit requested before any Infineon/G+D work.
It is intentionally honest: it separates what exists from what must be built.

--------------------------------------------------------------------------------
## 1. Current implementation inventory

### 1.1 Discovery (`internal/discovery`)
- Network scanners: TLS (`tls_scanner.go`), SSH (`ssh_scanner.go`), HTTP(S) (`http_scanner.go`),
  inventory/declared (`inventory_scanner.go`), SBOM (`sbom_scanner.go`, 673 lines).
- Local SBOM scan walks dependency manifests and maps known crypto libs → CBOM components
  (`sbom_scanner.go`). Library fingerprints present: openssl, boringssl, mbedtls, wolfssl,
  libsodium, sodium-native, gnutls, nacl, and more.
- Target classes (`targetclass.go`): website/host/ip/server/pod/path/hardware/**firmware**.
- `hardware` and `firmware` classes resolve to **declared inventory only**
  (`ScanDeclaredInventory`), i.e. an operator-supplied label/hash — **no binary parsing**.
- Safe dialing (`safe_dial.go`) with SSRF/loopback policy (`target_policy.go`).
- Core model: `discovery.ScanResult`, `discovery.Finding`, `discovery.CBOMComponent`
  (`types.go`, 92 lines). This is the stable contract; keep it.

### 1.2 Intelligence (`internal/intelligence`, ~2646 lines)
- Normalization adapters: `FromDiscoveryResult`, `FromContent`, `DedupFindings`.
- Unified `Finding` model (`finding.go`) with risk, controls, quantum, lifecycle timestamps.
- Pipeline `BuildReport` (`pipeline.go`) → findings + policy gate + Qiskit profile +
  audit score + client architecture + PQC readiness + CycloneDX.
- Policy gate (`policy.go`), risk (`risk.go`), fingerprints (`fingerprint.go`),
  external tools (`adapters_external.go`: Syft/Trivy/Grype/Gitleaks/OSV, optional).
- **No firmware/ELF/X.509 parsing anywhere. No PQC replacement engine beyond classification.**

### 1.3 BOM layer (`internal/bom`)
- `framework.go`: edition-aware five-BOM catalog (CBOM/SBOM/QBOM/AIBOM/IBOM + HBOM).
- `unified.go`: `Unified` merge of CBOM/QBOM/SBOM/HBOM/AIBOM/IBOM + API surface.
- `hsm.go`: declared PKCS#11/HSM status; honest "no key extraction".
- HBOM source is `internal/hardware/catalog.go`: **declared** QSIC/HSM/TPM/SE/QRNG inventory.

### 1.4 Quantum / PQC (`internal/quantum`)
- PQC service (`pqc_service.go`): ML-KEM-768 (FIPS 203), ML-DSA-65 (FIPS 204),
  SLH-DSA (FIPS 205), hybrid — for keypair + signing; plus `qiskitprofile` local
  classical taxonomy scoring. No firmware/PQC planning graph.

### 1.5 API (`internal/api`, ~18.6k lines)
- `shared`, `oss`, `enterprise` route setups. Route count ~313 registered handlers.
- Versioned group `/api/v1`. Score/evidence endpoints per `docs/PRODUCT_STATUS.md`.
- Auth: `internal/authn` (JWT, TOTP, OAuth, RBAC roles Admin/Operator/Analyst/Viewer).
- Tenant isolation exists (`tests/scan_tenant_isolation_test.go`); `X-Tenant-ID` ignored
  in favor of JWT claim.
- **No `/api/v1/firmware/*` or `/api/v1/identity/*` routes.**

### 1.6 CLI (`cmd/rivicq/main.go`, 306 lines)
- Commands: `scan|sbom|cbom|vuln|secrets|iac|compliance|policy`, `--fail-on`, `--format`.
- Reuses `intelligence.BuildReport`. **No `firmware`/`identity` subcommands.**

### 1.7 Frontend / Graph
- React SPA `web/` (Dashboard, Scanner, Assets, Findings, MigrationHub, HsmQuantum,
  enterprise/*). NEXUS/Fabric graph app `fabric/` (Vite + React): graph panel,
  SecurityGraph, Topology; pages Certs, Identity, Ibom, CryptoBom, Attack.
- Graph is **synthetic Northbridge data** in the demo build.

### 1.8 Fixtures / tests / CI
- `fixtures/`: crypto-test, vulnerable-*, terraform-test (source-level, not firmware).
- `tests/`: unit, integration, enterprise, scanner/trail/isolation.
- CI: `.github/workflows/*` incl. `rivicq-security.yml` (builds CLI, `rivicq scan . --fail-on BLOCK`).
- **No `fixtures/partners/`, no golden firmware/identity fixtures, no partner profiles.**

### 1.9 Docs
- Strong: ARCHITECTURE, BOM_FRAMEWORK, PRODUCT_STATUS, KNOWN_LIMITATIONS, CORE_ENGINE, FABRIC.
- **Missing: INFINEON, GD, EMBEDDED_CRYPTO, FIRMWARE_ANALYSIS, IDENTITY_CRYPTO,
  DEVICE_TO_CLOUD, PQC_EMBEDDED, PQC_IDENTITY, CRYPTO_AGILITY, PARTNER_VALIDATION.**

--------------------------------------------------------------------------------
## 2. Infineon gap analysis

| Capability required | Current state | Gap |
|---|---|---|
| Hardware/MCU/SoC/SE/TPM inventory | Declared catalog only (`hardware/catalog.go`) | Need firmware-derived + declared merge, provenance |
| Firmware binaries ELF/BIN/HEX/SREC/archives | **None** (label only) | Full static ingest engine |
| Firmware arch detection (ARM/ARM64/RISC-V) | None | `debug/elf` based |
| Crypto library detection in binary | Source manifests only | Binary string/segment evidence detection |
| Crypto API / PSA / TF-M detection | None | Evidence rules + profile mapping |
| Crystal/algorithm references vs library presence | Libraries mapped in SBOM only | Distinguish "present" vs "referenced" |
| Embedded certificate extraction (X.509) | TLS leaf cert only (network) | Extract DER/PEM from firmware + parse metadata |
| Device identity → cert → PKI chain | None | Identity artifact model + relations |
| Secure boot / RoT markers | None | Evidence rules |
| TLS/DTLS, wireless protocol mapping | Network TLS only | Static protocol/stack detection |
| Firmware version diff | None | `firmware compare` |
| Crypto-agility score (embedded) | None | Evidence-based scorer |
| CLI `firmware *` | None | New subcommands |
| API `/api/v1/firmware/*` | None | New versioned routes |

## 3. G+D gap analysis

| Capability required | Current state | Gap |
|---|---|---|
| SIM/eSIM/iSIM/eUICC model | **None** | Identity artifact types + profile |
| Secure element model | Declared `se` kind only | eSIM/SE metadata model |
| Device identity artifact | IBOM row (`bom/unified.go`) only | First-class identity artifact + provenance |
| Certificate lifecycle / expiry / weak alg | TLS leaf only | Certificate engine (shared) |
| PKI / CA chain modelling | None | PKI object + `issued_by`/`belongs_to` relations |
| Credential metadata (no secrets) | None | Metadata-only model, hard no-secret guarantee |
| TLS + IoT connectivity mapping | Network TLS only | Static config/artifact mapping |
| Identity/cert config diff | None | `identity compare` (no secret material) |
| CLI `identity *` | None | New subcommands |
| API `/api/v1/identity/*` | None | New versioned routes |
| G+D connectors (PKI/CA/IdP/eUICC) | None | Interface + fixture + `CONNECTOR REQUIRED` |

## 4. Shared architecture gap analysis

- **No vendor-neutral profile registry.** Domain/vendor knowledge is either hardcoded in
  scanners or absent. Requirement 4 (no hardcoding) is unmet.
- **No unified artifact/provenance model** with the mandated minimum fields
  (id, tenant_id, type, name, version, source, location, asset_id, component_id,
  confidence, evidence, risk, quantum_risk, pqc_status, timestamp).
- **No relation model / graph builder** for `uses|implements|issued_by|belongs_to|contains|
  connects_to|serves` feeding one NEXUS engine.
- **Certificate engine is network-only** and not reusable for firmware/identity artifacts.
- **No untrusted-artifact safety layer** (size/decompression/traversal/symlink limits) for
  uploaded blobs.
- PQC planning is per-finding; no **asset → dependency → replacement → phase** plan object.

## 5. P0 / P1 / P2 implementation plan

### P0 — make one honest Infineon + G+D vertical slice real (no new microservices)
1. `internal/profile` — vendor-neutral domain profile registry; builtin profiles
   `embedded/generic`, `embedded/infineon`, `identity/generic`, `identity/gd`; JSON-loadable.
2. `internal/cryptoart` — unified cryptographic artifact + relation model with provenance
   (minimum-field contract) + graph builder (single NEXUS source).
3. `internal/firmware` — safe static ingest (ELF/BIN/HEX/SREC/zip/tar/gz), size/timeout/
   traversal/symlink limits, arch/sections/symbols/strings, crypto library + algorithm +
   API (PSA/TF-M) detection with evidence, embedded X.509 extraction, CBOM + PQC + diff.
4. `internal/certeng` — X.509 metadata engine (subject/issuer/serial/validity/key alg/curve/
   sig alg/SAN/fingerprint/chain), classical+quantum+expiry risk, reused by firmware+identity.
5. CLI: `rivicq firmware scan|cbom|pqc|compare`, `rivicq identity scan|cbom|pqc`.
6. Fixtures `fixtures/partners/infineon/` and `fixtures/partners/gd/` (synthetic only).
7. Golden + security tests (malformed/oversized/traversal/zip-bomb/symlink/IDOR/RBAC/secret-leak).
8. Docs: INFINEON, GD, EMBEDDED_CRYPTO, FIRMWARE_ANALYSIS, IDENTITY_CRYPTO, PQC_EMBEDDED,
   PQC_IDENTITY, CRYPTO_AGILITY, PARTNER_VALIDATION + readiness scores.

### P1 — API + governance surface
- `POST/GET /api/v1/firmware/*`, `/api/v1/identity/*` with auth, RBAC, tenant isolation,
  size limits, timeouts, audit logging; wire into existing `shared`/`oss`/`enterprise` setups.
- Policy engine extended with profile `crypto_policy` (forbidden/warn/approved/pqc/hybrid).
- NEXUS partner views as filters on the existing graph (no new engine).
- GitHub Action `profile: embedded|identity` inputs (backward compatible).

### P2 — connectors, lifecycle, reports
- Connector interfaces (PKI/CA/IdP/eUICC/HSM/SE/firmware repo) marked `CONNECTOR REQUIRED`.
- Device lifecycle stages + reports (Embedded / Identity & Connectivity) + partner dashboards.

## 6. Files/modules that must change

- New: `internal/profile/*`, `internal/cryptoart/*`, `internal/firmware/*`, `internal/certeng/*`.
- New: `cmd/rivicq/main.go` (add subcommands; do not break existing), `internal/rivicqcli/*`.
- New: `fixtures/partners/infineon/*`, `fixtures/partners/gd/*`.
- New docs (see §5.8).
- Later (P1): `internal/api/shared/firmware.go`, `internal/api/shared/identity.go`,
  route registration in `oss.SetupRoutes` / `enterprise.SetupRoutes`, `docs/openapi.yaml`.

## 7. Existing functionality that must NOT be duplicated

- `discovery.ScanResult` / `Finding` / `CBOMComponent` — reuse; do not fork.
- `intelligence.Finding` / `BuildReport` / policy gate / fingerprints — reuse; firmware
  findings must normalize into `intelligence.Finding`.
- `bom.Unified` / `bom.FromDiscovery` / five-layer framework — extend; do not rebuild CBOM.
- `quantum/qiskitprofile` + `pqc_service` — reuse for scoring/PQC classification.
- `hardware.Catalog` HBOM — merge into, do not replace.
- `internal/authn` RBAC + tenant middleware — reuse for new endpoints.
- `internal/middleware/audit.go` — reuse for new audit events.
- `fabric/` graph — extend with filters; do **not** create four graph engines.

## 8. Test plan

- **Golden (accuracy):** for every partner fixture assert exact expected
  `format, arch, libraries, algorithms, crypto_apis, certificates, protocols, quantum_risk,
  pqc_status, relations`.
- **Security:** malformed ELF; magic-only ELF; oversized blob (limit reject); Intel HEX with
  bad record; SREC with bad checksum; zip/tar traversal (`../`); symlink escape; zip bomb
  (ratio cap); decompression cap; scan timeout; no execution (assert we never exec).
- **Secret safety:** assert no private keys / SIM secrets / credentials ever read or emitted
  (regex scan over all output JSON).
- **Isolation:** cross-tenant firmware/identity IDs return 404 (P1, when API lands).
- **Regression:** `go build ./...`, `go test ./...`, `rivicq scan . --fail-on BLOCK`,
  `rivicq cbom` unchanged; new commands exit 0/1 correctly.

--------------------------------------------------------------------------------
### Baseline recorded (pre-change)
- `go build ./...` → exit 0.
- `go version go1.26.9`.
- Existing `rivicq scan` and CBOM path unchanged by this work.

> Honesty invariant for all new code: metadata and cryptographic intelligence only.
> No private-key extraction, no SIM/SE secret extraction, no firmware execution,
> no flashing, no silicon RE, no certification claims.

--------------------------------------------------------------------------------
## 9. Implementation status (post-audit)

The gaps and plan above are the **as-found** snapshot. This section records what
has since landed against that plan; §1–§8 are kept unchanged for history.

### Delivered
- **P0 engines:** `internal/profile` (vendor-neutral registry + builtin
  `embedded/{generic,infineon}` and `identity/{generic,gd}`), `internal/cryptoart`
  (artifact + relation + provenance contract), `internal/firmware` (safe static
  ingest, detection, CBOM/PQC/diff), `internal/certeng` (shared X.509 metadata),
  `internal/identity` (SIM/eSIM/iSIM/SE metadata, no secrets).
- **P0 CLI:** `rivicq firmware scan|cbom|pqc|compare`, `rivicq identity scan|cbom|pqc`.
- **P0 fixtures:** `fixtures/partners/infineon/`, `fixtures/partners/gd/` (synthetic).
- **P1 API:** `POST/GET /api/v1/firmware/*` and `/api/v1/identity/*`
  (`analyze`, `compare`, `profiles`, `limits`) registered in
  `shared.SetupFirmwareIdentityRoutes`, wired from `oss.RegisterSupplementalRoutes`
  so **both OSS and Enterprise** editions serve them. RBAC via
  `resourcePermissionTable` (`firmware`/`identity` → read `cbom:read`, write
  `scans:start`), tenant isolation, `MaxBytesReader` size caps and engine timeouts,
  audit logging, OpenAPI entries. Handlers: `internal/api/shared/artifact_analysis.go`.
- **P1/P0 docs:** INFINEON, GD, EMBEDDED_CRYPTO, FIRMWARE_ANALYSIS, IDENTITY_CRYPTO,
  DEVICE_TO_CLOUD, PQC_EMBEDDED, PQC_IDENTITY, CRYPTO_AGILITY, PARTNER_VALIDATION,
  FIRMWARE_IDENTITY_API.
- **POC:** `scripts/poc/partner_artifact_analysis.sh` (end-to-end, both partners,
  anonymous request rejected with 401).

### Still open
- **P1 remainder:** policy-engine `crypto_policy` (forbidden/warn/approved/pqc/hybrid)
  authoring; NEXUS partner views as graph filters; GitHub Action `profile:` inputs.
- **P2:** live connector interfaces (PKI/CA/IdP/eUICC/HSM/SE/firmware repo) marked
  `CONNECTOR REQUIRED`; device lifecycle stages, partner dashboards, periodic reports.

### Status corrections to §1
- §1.5 line "No `/api/v1/firmware/*` or `/api/v1/identity/*` routes" — now provided (above).
- §1.6 "No `firmware`/`identity` subcommands" — now provided.
- §1.8 "No `fixtures/partners/`" — now provided.
- §1.9 "Missing: INFINEON, GD, …" — now authored.
