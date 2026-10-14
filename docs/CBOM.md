# CBOM

RivicQ emits a Cryptographic Bill of Materials from the **same** intelligence engine used by the CLI, API, and GitHub Action. There is not a second CBOM scanner.

## How it is produced

```
Input (dir | GitHub files | discovery targets)
  → content rules + optional SBOM path scan
  → intelligence.Finding (normalized)
  → policy gate
  → CycloneDX 1.6 cryptographic-asset document
```

Code: `internal/intelligence/cyclonedx.go`, `internal/api/shared/github_content_scan.go`, `internal/discovery/sbom_scanner.go`.

## CLI

```bash
go build -o bin/rivicq ./cmd/rivicq
./bin/rivicq scan . --format json
./bin/rivicq cbom ./src --format json
```

The `cyclonedx` object is embedded in the scan report JSON. `rivicq cbom` is the same pipeline with `metadata.mode=cbom`.

## What a component means

A CBOM row is an **algorithm or library observation** with provenance. It is not:

- a CVE unless an SCA adapter added one
- proof of runtime execution (unless `detection_method=protocol-handshake` or `x509-parse`)
- a certification

Inventory rows (`presence_kind=inventory`) are assets, not failures.

## Schema

See `docs/audit/CBOM_ACCURACY.md`. Official CycloneDX schema validation (network) is not wired; `ValidateCycloneDX` checks the fields this engine guarantees.
