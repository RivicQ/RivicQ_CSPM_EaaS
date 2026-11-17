# Business requirements: RivicQ CSPM

Owner: RivicQ GmbH (Berlin). Source repository: [RivicQ/RivicQ_CSPM_EaaS](https://github.com/RivicQ/RivicQ_CSPM_EaaS).

This BRD states what the business needs from the product. Engineering detail is in [SRD.md](SRD.md). Product scope is in [PRD.md](PRD.md).

## 1. Business problem

Customers cannot see which cryptography they run, which of it fails quantum-era planning, or which control the evidence supports. They need one inventory (CBOM, with SBOM) and an honest edition split: Community for the scanner, Enterprise for the licensed control plane.

## 2. Business goals

1. A customer can run a scan and leave with CBOM evidence they can read.
2. The demo shows the client path — Discover, Mitigate, Report — on the architecture the product actually runs.
3. Website, documentation, graph, and console look like one product, using the Archify site as the map reference.
4. Claims stay inside what the repository implements. Control names are mappings, not certifications.

## 3. Users

| User | Business outcome |
|---|---|
| CISO | A short posture view and evidence they can hand to an auditor as mappings |
| Security engineer | A scan of a website, host, repository, or declared asset, then a finding list |
| DevOps | A CI gate (`rivicq scan`, GitHub Action) that fails on BLOCK |
| Evaluator | A public repo whose docs match the binary |

## 4. In scope

- Community scanner and console for CBOM/SBOM.
- Enterprise control plane when a license key is present (SSO config, audit, API keys, connectors when the customer supplies credentials).
- Static firmware and identity metadata (`internal/firmware`, `internal/identity`) as inventory evidence.
- Archify system maps as the picture of the running system.
- A labeled demo when no engine is attached (GitHub Pages).

## 5. Out of scope

- Binary reverse engineering, firmware execution, key extraction, or die inspection. The GitHub repository analyzes bytes and emits metadata. It does not emulate silicon.
- Certifying the customer or RivicQ against DORA, ISO, PCI, SOC 2, or FIPS.
- A second product surface that covers the console with a full-page diagram.

## 6. Demo the business can show

1. Open the Archify site for the full system map.
2. Open the console and run a scan. The page stays the scanner.
3. The client strip moves from waiting to the scan’s Discover / Mitigate / Report result.
4. Docs and the graph use the same three phases and a small map link, not a second full-screen stage.

## 7. Acceptance

- An evaluator can point at `archify/site/index.html` and at `/scanner` and see the same path.
- Firmware language in the UI matches [FIRMWARE_ANALYSIS.md](FIRMWARE_ANALYSIS.md): metadata only.
- No page other than the Archify site uses a viewport-height diagram frame.
