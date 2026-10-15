# BOM coverage (honest)

| Type | Detector | Maturity | What it is not |
|------|----------|----------|----------------|
| CBOM | Content rules + discovery components + firmware/identity CBOM items | **T** — fixtures + CycloneDX contract | Not a full CycloneDX Tool Center certified implementation |
| SBOM | lockfile parsers; optional Syft | **P** — lockfiles yes; full graph depends on Syft | Not a complete application SBOM without Syft |
| QBOM | PQC taxonomy on CBOM rows | **P** — classification yes; Enterprise pack flag | Not CAVP, not IBM Quantum hardware |
| HBOM | `internal/hardware` catalog + optional PKCS#11 | **P/C** | Not firmware reverse engineering |
| AIBOM | declared registry | **P** | Not a model-weight scanner |
| IBOM | identity/cert analysis + secrets in CBOM | **P** | Not a directory/IdP sync without a connector |
| UBOM | `internal/bom.Unified` | **P** | A view, not a scanner |

Partner names in docs (Infineon, G+D, IBM, …) are **profiles, fixtures, or optional connectors**. They are not endorsements and not live APIs unless credentials exist.
