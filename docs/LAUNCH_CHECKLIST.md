# Full product ready checklist

- [x] Community CLI `rivicq scan .` and GitHub Action policy gate
- [x] Clear sky-blue / white / Outfit UI on auth, dashboard, and docs hub
- [x] Sign-In / Register: Community vs Enterprise, validation, demo access, Supabase on Pages
- [x] Community dashboard does not mix simulated enterprise estates (unless Demo)
- [x] Inventory search, sort, JSON + print-to-PDF export
- [x] Homepage GitHub scan path + Discover → Analyze → Quantify
- [x] Dataset harness (`make analyze-datasets`) — 5/5 passing
- [x] Enterprise: JWT RBAC helper, audit tenant from JWT only (no `X-Tenant-ID` spoof)
- [x] Legal pack: LICENSE (Apache-2.0 Community), LEGAL.md, NOTICE, PRIVACY.md, TRADEMARKS.md, SECURITY.md, CONTRIBUTING.md
- [x] Known limitations documented (Pages has no API; mappings are not certifications)
- [x] Helm / Compose charts remain in `deploy/` (air-gapped packaging)
- [x] GitHub Pages deploy from `main`

## Operator follow-ups (environment-specific)

- Configure cloud credentials for live multi-cloud inventory
- Complete SAML ACS with the customer IdP
- Point Pages or a reverse proxy at a `DEMO_MODE` API if live demo JWTs are required
