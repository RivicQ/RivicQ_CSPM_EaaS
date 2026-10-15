# Unified BOM

One view over **one** scan result. Code: `internal/bom/unified.go`, `internal/cryptoart`.

```
CBOM  cryptographic assets     Community
SBOM  software components      Community
QBOM  quantum classification   Enterprise layer (Community still classifies on CBOM)
HBOM  hardware / HSM declared  Enterprise + connector
AIBOM declared AI/ML registry  Enterprise (not a weight scanner)
IBOM  identities bound to crypto Enterprise
```

`FromDiscovery` does **not** replace `discovery.ScanResult`. The GitHub Action and CLI keep emitting the same `intelligence.Report`.

UBOM in this codebase is the **unified** JSON (`Unified` struct), not a seventh scanner.
