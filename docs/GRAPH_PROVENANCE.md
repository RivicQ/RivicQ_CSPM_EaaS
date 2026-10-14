# Graph provenance

Live/static analysis graphs:

- `internal/cryptoart` — vendor-neutral objects + typed relations (`uses`, `implements`, `issued_by`, …) with confidence and evidence strings.
- Firmware/identity reports embed `graph` (`*cryptoart.Graph`).
- Content/CLI scan reports do **not** currently emit a full graph document; they emit findings + CycloneDX.

Demo graph:

- `fabric/` — synthetic, labeled, no secret values.

Rule: never copy Northbridge fixture rows into an API response for a failed live scan. If a handler cannot produce graph data it must 404/409/empty with an error, not swap in demo JSON unless `DEMO_MODE` / the client demo session is explicit.
