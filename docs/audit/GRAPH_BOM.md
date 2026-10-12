# RivicQ CSPM — Graph & Unified BOM (Phase 8)

Commit `1fa0910`.

## What exists

- `internal/bom/framework.go` — five/six-layer BOM framework
  (CBOM, SBOM, QBOM, HBOM, AIBOM, IBOM) with per-edition enablement and an
  explicit `Honesty` string per layer.
- `internal/bom/unified.go` — `FromDiscovery(target, *ScanResult) Unified`,
  building the merged view from `disc.Components` + `disc.Findings` **without
  changing `ScanResult`**.
- `internal/bom/hsm.go` — HSM/hardware inventory helpers.
- `fabric/` — the RivicQ Graph UI, rendered from `fabric/src/data/catalog.ts`.

## Provenance / traceability assessment

| Requirement | Status | Notes |
|---|---|---|
| Nodes sourced from real findings | **Partial** | CBOM/SBOM rows come from `disc.Components`/`Findings`; QBOM classifies via `qiskitprofile`; IBOM synthesized from secret-ish findings. |
| Stable node IDs | **Partial** | Only `IBOM.ID` carries an ID (from the finding). CBOM/SBOM `Asset` rows have **no stable ID**. |
| Typed relationships/edges | **Absent** | `Unified` is **flat lists per layer**, not a graph of typed relationships. |
| Per-node provenance | **Minimal** | A single `Source` string on `Identity` (`"scan"`). Assets carry no source/timestamp/confidence. |
| Dedup | **Absent across layers** | A component is appended to both CBOM and SBOM; no cross-layer identity reconciliation. |
| Synthetic vs real separation | **Present (UI)** | `fabric/src/data/catalog.ts` is explicitly labelled "Labeled synthetic demo… No customer secrets". |
| Honesty labeling | **Present** | `Catalog().Honesty` is carried on the Unified note; QBOM rows state "Local taxonomy — not a qubit measurement". |

## Findings

1. **G-1 (Medium, evaluation-relevant).** The "unified BOM / graph" is a
   multi-layer **flat view**, not a provenance-tracked node/edge graph. For an
   Infineon/G+D traceability story ("this algorithm → this library → this cert →
   this device"), the code does not yet model relationships or stable IDs.
2. **G-2 (Low).** No cross-layer dedup: the same component can appear in both
   CBOM and SBOM rows.
3. **G-3 (Info).** Provenance is a single free-text `Source` on IBOM only;
   assets lack source/confidence/timestamp for traceability.

## Recommendation

If traceability is a partner requirement, add a thin provenance model:
`{stable_id, layer, source, scan_id, location, confidence}` on each node and a
typed edge list (e.g. `device —uses— library —implements— algorithm`). This is a
contained addition that reuses existing `ScanResult` data and does not alter the
`ScanResult` contract.
