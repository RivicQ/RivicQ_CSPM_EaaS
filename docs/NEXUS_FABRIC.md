# NEXUS / FABRIC / RivicQ Graph

Inspected in-tree:

- Directory: `fabric/`
- Docs: `docs/FABRIC.md`, `docs/GRAPH.md`, `fabric/README.md`
- Pages route: `/fabric` (legacy `/nexus` redirects)

**What it is:** a labeled React demo of a security graph (wordmark GRAPH). Data is the synthetic **Northbridge Exchange** fixture. Finding IDs remain `QSF-*` historically.

**What it is not:** a live projection of `intelligence.Report` from the Go API. Failed live scans are not silently replaced with this fixture inside the Community console — the console uses API data or a **labeled** demo session (`rivicq-demo-session`).

Typed edges with provenance for *live* scans live in `internal/cryptoart` (`Relation`, `Object`) and firmware/identity `graph` JSON. Wiring those graphs into `fabric/` is **not implemented**.
