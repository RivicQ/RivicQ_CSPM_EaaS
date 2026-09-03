# Client architecture — Discover, Mitigate, Report

High-level design of RivicQ Security Cloud from **open source (Community)** to **Enterprise**.
This is the operator-facing path. It is not a certification and it does not claim a shipped QSIC chip.

Companion: [ARCHITECTURE.md](ARCHITECTURE.md) · [editions.md](editions.md) · [PRODUCT_STATUS.md](PRODUCT_STATUS.md)

## Four layers (CBOM architecture)

Aligned to the RivicQ CBOM architecture note (CycloneDX 1.6, DORA RTS, NIS2, FIPS 203/204/205):

```
1. Input          website · host/IP · server · k8s pod · local path · declared HSM/QSIC
2. CBOM engine    TLS / HTTPS / SSH / SBOM discovery → normalize → policy gate → Qiskit profile
3. Operationalize PQC mapping (ML-KEM / ML-DSA / SLH-DSA) · HNDL score · GRC connectors (Enterprise)
4. Output         CycloneDX CBOM · intelligence JSON · audit/Qiskit scores · DORA pack (Enterprise)
```

Original architecture diagrams named third-party GRC/PQC platforms as optional connectors.
This product treats them as **customer-credential connectors** (empty when disconnected). They are not runtime dependencies and not trademarks of RivicQ.

## Client path

| Phase | What happens | Community (OSS) | Enterprise |
|---|---|---|---|
| **Discover** | Classify the target (website, host, IP, server, pod, hardware, path) and schedule scanners | TLS/HTTPS/SSH/SBOM + **declared** pod/QSIC inventory | Same engine + live kube attach and cloud/HSM connectors when credentials exist |
| **Mitigate** | Map Shor/Grover-class algorithms to FIPS 203/204/205 replacements | JSON migration list | Same mapping + DORA pack and control-plane evidence |
| **Report** | CBOM + scores + control mappings | `GET /scans/:id/report` (stable `ScanResult`) and `/intelligence` | Same JSON + licensed pack, audit log, API keys |

## Scan targets in the report

Every completed scan status includes `target_class`, `resources`, and `finding_items`. Intelligence adds `client_architecture` and `pqc_readiness`.

| Class | `scan_type` | Community resources | Notes |
|---|---|---|---|
| Website | `website` | TLS + HTTPS; SSH skipped | Public URL or `www.*` |
| Host | `host` / `cbom` | TLS + SSH + HTTP | Hostname |
| IP | `ip` | TLS + SSH + HTTP | IPv4 / IPv6 |
| Server | `server` | TLS + SSH + HTTP | Same discovery, labeled server |
| Pod | `pod` | `k8s` declared; TLS if `@host` | `pod://namespace/name[@host]` — not eBPF, not secret dump |
| Hardware | `hardware` | `hardware` catalog | QSIC research ASIC + generic HSM/TPM/QRNG **declaration** |
| Path | local `./` | SBOM | Crypto libraries in the tree |

## Editions

| | Open source / Community | Enterprise |
|---|---|---|
| Legal | Apache-2.0 | Commercial license (`CRYPTOBOM_LICENSE_KEY=ENT-…`) |
| Engine | Full CBOM + Qiskit local taxonomy | Same engine |
| Live demo (GitHub Pages) | **Limited Community workspace** | UI preference only — not a license |
| DORA pack | JSON mappings | Pack flag enabled |
| Multi-cloud / quantum / HSM connectors | Catalog only | Connectors when credentials exist |
| QSIC | Declared research ASIC (not shipped, not FIPS certified) | Same honesty + persistable inventory |
| SDLC extras (eBPF, binary RE, AI agents, ZK) | Out of MVP (see SDLC timeline) | Still not claimed |

## PQC readiness (workbook)

The PQC Readiness Assessment workbook scores four inventory layers plus HNDL and compliance mapping:

- **SBOM / CBOM / HBOM / AIBOM** → synthesized QBOM
- **HNDL** — share of Shor-class findings
- **DORA RTS Art. 9**, **DORA Art. 6**, **NIS2 Art. 21**, **BSI TR-02102**, **FIPS 203/204/205**
- Community: JSON scores on `/scans/:id/intelligence` (`pqc_readiness`)
- Enterprise: `pack_available: true` (mappings, not a Big-4 assessment)

## Hardware / QSIC

QSIC (RivicQ research ASIC, 65nm, ML-KEM/ML-DSA/SLH-DSA, FIPS 140-3 Level 3 **roadmap**) is **inventory metadata**.

`GET /api/v1/hardware/catalog` and `POST /inventory/hardware/discover` return the declared catalog. They do not reverse-engineer firmware, extract keys, or attest a certified module.

## Cloud and quantum services

| Service | Community | Enterprise |
|---|---|---|
| Qiskit-aligned estate score | Local taxonomy (`qiskitprofile`) | Same + optional quantum **connector** |
| IBM Quantum Runtime | Not invoked | Optional API key; never required for scores |
| AWS / Azure / GCP / other cloud | Not inventoried | Connector APIs; empty without credentials |
| Cloud HSM | Declared catalog | Connector when configured |

## APIs

```
GET  /edition                         # features + scan_targets catalog
GET  /api/v1/architecture             # four layers + edition public map
GET  /api/v1/hardware/catalog         # declared HSM/TPM/QSIC
POST /api/v1/scans                    # target + scan_type
GET  /api/v1/scans/:id                # status, resources, target_class
GET  /api/v1/scans/:id/report         # discovery.ScanResult (do not break)
GET  /api/v1/scans/:id/intelligence   # + client_architecture + pqc_readiness
```

## Maintenance

- Shared engine lives in `internal/discovery` and `internal/intelligence`. Do not change the `ScanResult` contract for UI work.
- Edition flags live in `internal/edition`. OSS remains limited; Enterprise enables the control plane.
- GitHub Pages deploys from `main` (`.github/workflows/pages.yml`) as a **Community** static demo with no production API.
- System tests: `go test ./internal/discovery/ ./internal/intelligence/ ./internal/edition/ ./internal/hardware/`
