# Software requirements: RivicQ CSPM

Software requirements for the system in [RivicQ/RivicQ_CSPM_EaaS](https://github.com/RivicQ/RivicQ_CSPM_EaaS). Read with [PRD.md](PRD.md), [BRD.md](BRD.md), [TRD.md](TRD.md), and [CLIENT_ARCHITECTURE.md](CLIENT_ARCHITECTURE.md).

## 1. Client architecture

Every completed scan exposes `client_architecture` on `GET /api/v1/scans/:id/intelligence` (`internal/intelligence/architecture.go`).

| Phase id | Meaning |
|---|---|
| `discover` | Target class and which scanners ran (TLS, HTTPS, SSH, SBOM, declared pod/hardware) |
| `mitigate` | Algorithm family mapped to ML-KEM / ML-DSA / SLH-DSA. Not a key rotation |
| `report` | CBOM / intelligence JSON. Enterprise may set `pack_available` on `pqc_readiness` |

The console renders those three phases in `web/src/components/scanner/ScanReportPanel.tsx`. Before intelligence returns, the same three phases show status `waiting`. That idle copy is the prototype layout, not fabricated findings.

## 2. Surfaces

| ID | Requirement | Implementation |
|---|---|---|
| SR-UI-1 | The full interactive stage is only `archify/site/index.html` | `archify/site`, `archify/diagrams/*.html?present=1` |
| SR-UI-2 | Website and docs embed a plate about 132–148px, or a link | `ArchifyWorkflowEmbed` default; `docs/assets/horizon-docs.css` `.archify-embed-frame` |
| SR-UI-3 | The console does not embed a diagram iframe | `ArchifyWorkflowEmbed` `compact` is a one-line bar (`data-embed="bar"`) on `/scanner` |
| SR-UI-4 | Console page headers are title, subtitle, and actions | `web/src/components/PageFrame.tsx` |
| SR-UI-5 | Graph landing uses Discover → Mitigate → Report and links to the Archify gallery | `fabric/src/pages/Landing.tsx` |
| SR-UI-6 | Violet `#7C3AED` is an accent. It is not a page-sized panel behind operator tools | `docs/DESIGN_SYSTEM.md` |

`ScanResult` in `internal/discovery` stays stable. This UI work does not change that JSON contract.

## 3. Scan behavior the demo must keep

| ID | Requirement | Evidence |
|---|---|---|
| SR-SCAN-1 | `POST /api/v1/scans` accepts website, host, IP, server, pod, hardware, and firmware declarations | `internal/discovery/targetclass.go` |
| SR-SCAN-2 | Completed scans return resources, findings, and intelligence including `client_architecture` | `internal/intelligence/architecture.go` |
| SR-SCAN-3 | Community pages without an API use the labeled demo and say so | `web/src/pages/Home.tsx`, `docs/DEMO_RUNBOOK.md` |
| SR-SCAN-4 | Enterprise-only packs return 403 on the OSS binary | `internal/edition/edition.go` |

## 4. Firmware and identity (repository alignment)

Aligned to this repository, not to a separate reverse-engineering toolchain.

| ID | Requirement | Evidence |
|---|---|---|
| SR-FW-1 | Firmware analysis is static: ELF, HEX, S-record, strings, certificate metadata | `internal/firmware/analyze.go`, `docs/FIRMWARE_ANALYSIS.md` |
| SR-FW-2 | Size, depth, and time limits apply before a full read | `internal/firmware/limits.go` |
| SR-FW-3 | The analyzer does not execute, emulate, flash, or extract private keys | Honesty text in `docs/FIRMWARE_ANALYSIS.md` and `internal/hardware/catalog.go` |
| SR-FW-4 | UI copy for hardware and firmware targets repeats that boundary | `web/src/pages/Scanner.tsx` `SCAN_TYPE_INFO` |

Binary reverse engineering, Ghidra-style lifting, and silicon inspection are not requirements of this release.

## 5. Editions

Community and Enterprise share `internal/discovery` and `internal/intelligence`. Edition is an entitlement (`CRYPTOBOM_LICENSE_KEY` with an `ENT-` prefix), not a second scanner. GitHub Pages builds Community only.

## 6. Verification

- `web` unit tests cover the compact map bar (no iframe) and the three-phase client strip.
- `go test ./internal/discovery/ ./internal/intelligence/ ./internal/edition/ ./internal/firmware/` covers the engine these screens read.
