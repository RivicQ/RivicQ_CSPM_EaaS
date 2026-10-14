# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed
- **Nebula-only product chrome** (2026-10-14). Public site, console, docs, marketing, Archify explorer, GitHub Pages, and Cloudflare Pages share one black/violet identity. Light-canvas “vibe” surfaces are gone. Theme toggle removed; inbox/stat cards/logos forced to nebula. Home/public nav is opaque so headings no longer sit under the sticky bar. GitHub Pages now runs `scripts/build-pages.sh` (same composite as Cloudflare). Operator scan workflow is an Archify diagram on Home, Scanner, Pricing, Request demo, Docs hub, Marketing, and public Site pages. Docs/marketing/archify force dark; `docs/assets/theme.js` is published by `build-pages.sh`. Live `/demo` matches the Archify product-site hero (Space Grotesk / Fraunces, cmd chip, plate receipts, workflow embed). Remaining public shells (`SitePage` product/CBOM/PQC/enterprise/security/contact/IBM, auth forgot/reset/verify/OAuth, edition switcher, Home hero) and console `GlassCard`/`DashboardPanel` plates use the same high-contrast Archify aura + plate tokens.

### Added
- **Theme-aware design system across every surface** (2026-10-12). One RivicQ visual system now runs in light **and** dark on the React app (`web/`), static `docs/`, static `marketing/`, and the RivicQ Graph (`fabric/`). All public/auth chrome moved from hardcoded dark hexes to MUI palette tokens (`background.default`/`background.paper`/`text.*`/`divider`/`primary.main`); `NebulaBackdrop` is dark-only; a theme toggle persists to `localStorage['rivicq.theme']` (shared key). Static sites gained a pre-paint theme bootstrap, `[data-theme="light"]` variable overrides, and a `.theme-toggle` control.
- **`web/` code-splitting** — `App.tsx` routes converted to `React.lazy`; fixed a `require()` call inside `useMemo` by hoisting `getAppTheme` to a top-level import. Main bundle **578 kB → 339.85 kB gzip (−41%)**.
- **archify diagram site wired into Pages** — `pages.yml` copies `archify/site` → `/archify/site` and `archify/diagrams` → `/archify/diagrams` (two-level layout preserves `../diagrams` and `../../docs` links); `docs/index.html` links to it.
- **Cloudflare Pages (parallel)** — `cloudflare/_headers` (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, cache policy), `cloudflare/_redirects` (base-path strip + SPA fallback), `wrangler.toml`, and `.github/workflows/cloudflare-pages.yml` (secret-gated; no-op until `CLOUDFLARE_API_TOKEN` is set). `scripts/build-pages.sh` is the single source of truth for the composite build.
- **Schema.org JSON-LD** on `marketing/index.html` (Organization, WebSite, WebPage, Service, OfferCatalog, ItemList), `marketing/showcase.html` (WebPage, BreadcrumbList), and `docs/index.html` (Organization, WebPage, BreadcrumbList). Only factual values are emitted; templates for LocalBusiness/GeoCoordinates/OpeningHours/Review/AggregateRating/Person/FAQPage/BlogPosting live in `docs/STRUCTURED_DATA.md`.
- **Governance & engineering docs**: `docs/MASTER_RULES.md` (19 house rules), `SECURITY_GUIDE`, `DATABASE_GUIDE`, `API_GUIDE`, `CODE_STYLE`, `PRD`, `TRD`, `ARCHITECTURE`, `DATA_MODEL`, `DATA_SOURCE`, `DEVSECOPS`, `SCRAPING`, `OPENSOURCE`, `ENTERPRISE`, `UI`, `ERROR_HANDLING`, `GITHUB_ACTIONS_AND_PAGES`, `TESTING`, `PRODUCTION_CHECKLIST`, `MICROTASKS`, `DECISIONS`, `ADMOB`, `CLOUDFLARE_PAGES`, `SECURITY_SECRET_REMEDIATION`.
- **Integration scaffolds** (`integrations/`, inert by default, credential-gated): Convex (schema + tenant-scoped functions), Better Auth, PostHog, Cloudflare R2 (signed-URL worker), Stripe (Go handlers + client), and n8n workflows. See `integrations/README.md` for the phased cutover plan.
- **Embedded (Infineon) and identity (G+D) vertical slice** — vendor-neutral domain profiles (`internal/profile`), unified crypto artifact model (`internal/cryptoart`), static firmware analysis (`internal/firmware`), identity/certificate analysis (`internal/identity`, `internal/certeng`). Metadata only: no firmware execution and no private-key/SIM/SE secret extraction.
- **CLI:** `rivicq firmware scan|cbom|pqc|compare`, `rivicq identity scan|cbom|pqc`.
- **API:** `POST/GET /api/v1/firmware/*` and `/api/v1/identity/*` (`analyze`, `compare`, `profiles`, `limits`) with RBAC (`cbom:read` / `scans:start`), tenant isolation, size caps, timeouts and audit logging. Wired via `shared.SetupFirmwareIdentityRoutes` so both OSS and Enterprise editions serve them.
- **Fixtures:** `fixtures/partners/infineon/`, `fixtures/partners/gd/` (synthetic only).
- **Docs:** INFINEON, GD, EMBEDDED_CRYPTO, FIRMWARE_ANALYSIS, IDENTITY_CRYPTO, DEVICE_TO_CLOUD, PQC_EMBEDDED, PQC_IDENTITY, CRYPTO_AGILITY, PARTNER_VALIDATION, FIRMWARE_IDENTITY_API, plus a working POC at `scripts/poc/partner_artifact_analysis.sh`.
- **Repository audit for G+D / Infineon evaluation** — `docs/audit/` (BASELINE, TEST_RESULTS, FEATURE_MATRIX, SECURITY_FINDINGS, CBOM_CORRECTNESS, DEVSECOPS_VERIFICATION, SECURITY_TENANCY, RELIABILITY, GRAPH_BOM, FINAL_REPORT) and dedicated `docs/partners/GD_VALIDATION.md` / `docs/partners/INFINEON_VALIDATION.md`. Every result is command-backed; features are classified implemented/tested/partial/connector-dependent/demo-only/not-implemented.
- **CBOM golden corpus enforced in CI** — new `datasets` job runs `scripts/analyze-datasets.py` (`make analyze-datasets`). New datasets/fixtures: `fixtures/crypto-test-ec` + `datasets/known-bad/crypto-ec` (ECDSA + PQC identifiers) and `fixtures/malformed` + `datasets/known-good/malformed` (negative/robustness: arbitrary binary → 0 findings, no crash, no BLOCK). Corpus now 7/7.
- **In-browser demo scan responder** — on static GitHub Pages (no backend) the console CBOM Scanner, Findings, scan reports, and the Home pilot now work end-to-end against clearly-labelled sample data. `web/src/demo/scanDemo.ts` answers the scan endpoints via an axios adapter when a client demo session is active; the Home hero gained a "Try the live demo" CTA that opens the interactive scanner (`demoLogin` → `/scanner`) and demo-mode chips where it used to show "engine unreachable".
- **Playful consumer/IoT design pass** — larger radii (`md` 12→16, `lg` 16→20, `xl` 20→28), soft elevation shadows, and a richer violet brand gradient in `web/src/theme/designSystem.ts`; the Home hero now speaks to IoT/device-first scanning.
- **Render deployment blueprint for real login/scanning** — `render.yaml` (Web Service + Postgres), self-contained `deploy/docker/Dockerfile.render` (in-process migrations; no separate migration container), and `docs/RENDER.md` walkthrough. `internal/server/server.go` now honors the 12-factor `$PORT` that Render/Railway/Fly inject. The Pages app switches to live mode when the `REACT_APP_API_URL` Actions secret is set; CORS already allows `https://rivicq.github.io`.
- **Honest engine-status UX on static Pages** — the "Needs the RivicQ engine" state is now explained instead of just shown: `PublicEngineNotice` is state-aware (live / interactive-demo / engine-not-hosted) with clear actions, a new `ScanWorkflowStrip` on Home visualizes the Target → Discovery → CBOM → Report flow with a live status legend, the Home scan panel explains *why* the Run button is disabled plus how to fix it, and the Login/Signup page carries a network/engine banner that points to the interactive demo and `docs/RENDER.md`. Copy is explicit that the demo is sample data and real, evidence-backed scans require the engine.

### Fixed
- **Build break** — `integrations/stripe/server/stripe.go` declared `successURL`/`cancelURL` only used in comments; `go build ./...` failed. Values now surfaced in the not-implemented response.
- **CBOM `components` was always empty** — `internal/intelligence/cyclonedx.go` accepted a `findings` argument it never used, and the content-scan path supplies no discovery components, so the embedded CycloneDX BOM had `components: []`. Cryptographic findings are now folded into `components` (deduped by algorithm|location; library-presence-only records excluded), `serialNumber` is a real `urn:uuid:<v4>`, and the tool version is `ScannerVersion`. Regression test `internal/intelligence/cyclonedx_test.go`. Verified `components` 0 → 5 for `fixtures/crypto-test`.
- **Cross-tenant report test** — added `TestScanReportIsTenantScoped` (cross-tenant `/scans/:id/report` → 404).
- **Enterprise test suite did not compile** — `tests/enterprise/*` referenced the removed `auth.NewTokenManager` / `auth.NewAuthService` / `auth.NewMockUserStore` APIs, breaking `go vet -tags enterprise ./...` and the `CI – Enterprise` unit-test job. Tests now mint tokens through the real `internal/authn` stack (`authn.LoadConfig` + `authn.NewService` + `AuthenticateMiddleware`).
- **`golangci-lint run ./...` clean (was 20 issues)** — pre-existing `errcheck` (failed `Close`/`Write`/`RemoveAll`), `ineffassign`, `staticcheck`, and `unused` findings fixed across `internal/firmware`, `internal/identity`, and `internal/api/shared`. The `identity.AnalyzeBytes` timeout context was created but never used (dead safeguard) and is now removed; `tar.TypeRegA` (deprecated) replaced with the equivalent `'\x00'`; dead `toUserResponse` duplicate removed.
- **CI unit tests failed on every push** — `TestIdentityAnalyzeCertificate` needs `fixtures/partners/gd/certificate/device-rsa2048.pem`, but the `*.pem` gitignore rule meant the synthetic G+D device certificates were never committed. Added `.gitignore` exceptions for `fixtures/partners/gd/certificate/` and `pki/` and committed all three certs (no private-key material).
- **`Deploy Cloudflare Pages` was a silent `startup_failure`** — GitHub does not allow the `secrets` context in `if:` conditionals, so the workflow was rejected at compile time (zero jobs, no logs). Tokens moved to job-level `env`; the deploy/skip steps now gate on `env.CLOUDFLARE_API_TOKEN`.
- **Enterprise/OSS smoke test could not boot** — the smoke flights set `JWT_SECRET=enterprise-smoke`/`demo-smoke` (16/10 bytes), under the hardened `authn` 32-byte minimum, so the backend refused to start. Secrets lengthened past 32 bytes.

### Changed
- **Cryptographic Security Posture Management** — Community is CBOM + SBOM. QBOM, HBOM, AIBOM, and IBOM are Enterprise (APIs return 403 on OSS). Local PQC classes on CBOM findings stay Community.
- **Public website chrome** — Home, Product, CSPM, CBOM, PQC, Enterprise, Security, Pricing, Request demo, IBM Partner Plus, and Contact share the rivicq.com nebula shell (black `#000000`, violet `#7C3AED`, Inter, pill CTAs). Contact is a marketing page, not a cream Command Center card. Console Overview keeps the same tokens.
- **RivicQ Graph** (wordmark **GRAPH**) is the labeled security-graph demo at `fabric/` and `/fabric`. Formerly NEXUS / Quantum Security Fabric. Finding IDs remain `QSF-*`. `/nexus` still redirects. Notes: [docs/FABRIC.md](docs/FABRIC.md), [docs/GRAPH.md](docs/GRAPH.md).
- **Deep-space nebula chrome** — black canvas `#000000`, violet `#7C3AED`, Inter, pill CTAs. Public home, console, docs, marketing, and Graph share the same visual system. Platform cards cover AI engineering, DevSecOps, cloud security, API security, GRC mappings, and quantum risk. Quantum scores on Pages come from scans you run, not a silent live estate.
- JWT **tenant isolation** on Community scan/inventory/findings/GitHub/intelligence paths. QBOM/HBOM/AIBOM APIs 403 on Community. Unauthenticated Home CBOM pilot stays on the public tenant. Enterprise inventory, compliance, quantum, multi-cloud, Terraform, and CNCF handlers ignore spoofable `X-Tenant-ID`.
- **Operator UX:** workflow nav (Overview / Findings / Scans), command palette (⌘K), breadcrumbs, persona layout, findings investigation from `GET /scans/findings`. Scan progress is indeterminate unless the API sends a percent. Fake notification counts, schedule toggles, and default compliance 75 were removed.
- Optional **outsourced scanners** (Syft, Trivy, Grype, Gitleaks, OSV) run on local `rivicq scan .` / scan intelligence when the binary is on PATH. Exit codes that mean “findings exist” are still parsed. Core status no longer claims Trivy/Syft/CodeQL are present unless `LookPath` succeeds.
- **Static sites are theme-aware** — `docs/`, `marketing/`, and `fabric/` share the `rivicq.theme` preference and default to the OS color scheme.

### Security
- **Git-history audit** — found two encrypted OpenSSH private keys (`rsaande`, `rsande`) committed and later deleted. Removed from the working tree; rotation required by the owner. Details and the optional history-purge procedure: `docs/SECURITY_SECRET_REMEDIATION.md`. No real secrets exist in the current tree (only synthetic test fixtures).
- `.gitignore` hardened for `.env*`, `secrets/`, `*.pem`, `*.key`, and accidental nested clones of this repository.
- Referenced from `SECURITY.md`; institutionalized in `docs/MASTER_RULES.md` and `docs/SECURITY_GUIDE.md`.

## [1.6.4] - 2026-09-06

### Fixed
- golangci-lint errcheck on API-key generation (`rand.Read`).
- govulncheck GO-2026-6354 / GO-2026-6355 by bumping `golang.org/x/crypto` to v0.56.0 (requires Go 1.26).
- CI/CD: frontend docs job installs `web/` deps; Syft uses `anchore/sbom-action`; integration waits for health and uses `sslmode=disable`; production validation builds binaries before start.
- CodeQL Advanced no longer runs on every push/PR (conflicts with default CodeQL setup).
- Docker images and scanner image use `golang:1.26-alpine`. `run-edition.sh` does not open a browser in CI.

## [1.6.3] - 2026-09-06

### Changed
- Community console is now a **warm-ink enterprise SaaS** (Source Sans 3 + copper `#C4783A` on `#0C0B09`). Public home is a product site with a labeled console preview; Command Center opens on an inbox queue instead of a circular posture gauge. Scan, auth, and dashboard APIs are unchanged.
- GitHub Pages build no longer fails on unused Horizon leftovers in Layout and Auth.

## [1.6.2] - 2026-09-06

### Changed
- Public home, sign-in, and Command Center now use an **operator loop** (Discover → Assess → Remediate → Report) with motion, a fabric preview, and page transitions. Scan, auth, and dashboard APIs are unchanged.

## [1.6.1] - 2026-09-06

### Changed
- Security Cloud chrome is dark-native zinc (Inter + JetBrains Mono) with Cmd+K search, workspace switcher, and time-range controls. Features and APIs are unchanged.
- GitHub Pages now creates `web/build/docs` before publishing FABRIC.md.
- golangci-lint ignores fixture trees; errcheck/staticcheck nits in OAuth, dotenv, and PQC seed paths are closed.

## [1.6.0] - 2026-09-06

### Added
- **Quantum Security Fabric** — original enterprise security-graph demo (`fabric/`, `/fabric` on Pages): command center, CSPM, graph, CryptoBOM, PQC/HNDL, five-BOM views, secrets/PKI (names only), compliance mappings, gated AI/automation, and disabled checkout. Labeled synthetic data only; secret values are never rendered ([docs/FABRIC.md](docs/FABRIC.md)).

## [1.5.9] - 2026-09-03

### Added
- Central `@rivicq.com` contact directory for the five ecosystem areas ([docs/CONTACT.md](docs/CONTACT.md), `/contact`, `/ecosystem`).
- Priority inboxes: founder, hello, sales, partnerships, research, grants, support, security, finance, investors, innovationhub. `admin@` stays private.
- Additional functions are documented as Zoho aliases, not separate paid mailboxes.
- Public `/contact` lists only the essential inboxes. Regional, demo, and product aliases stay unpublished.
- Horizon docs hub and [docs/contact.html](docs/contact.html) show the five-area directory as designed pages, not raw markdown.

## [1.5.8] - 2026-09-03

### Changed
- **Horizon** core UX: sky canvas, pill nav, five-BOM letter tiles, sky primary CTAs, navy chrome with a horizon band.
- Home, workspace, auth, edition switcher, and docs hub share the same visual system ([docs/UX_DESIGN.md](docs/UX_DESIGN.md)).

## [1.5.7] - 2026-09-03

### Added
- Five-BOM DevSecOps framework: QBOM, AIBOM, SBOM, IBOM, CBOM ([docs/BOM_FRAMEWORK.md](docs/BOM_FRAMEWORK.md)).
- Shared APIs: `/bom/framework`, `/bom/pipeline`, `/bom/unified`, `/governance/controls`, `/hsm/status`, `/quantum/status`, `/security/api`, `/security/ai`.
- Console routes: `/bom`, `/pipeline`, `/security/api`, `/security/ai`, `/connectors/hsm`, `/governance`, `/migration`.
- Community: CBOM + SBOM + local QBOM, TLS API hygiene, pipeline stages 1–6. Enterprise: AIBOM, IBOM, PKCS#11/HSM connector, GRC pack flag.
- Honest HSM and quantum status (disconnected without customer credentials). QSIC remains declared research hardware.

### Changed
- Sky-blue/white Security Cloud UX: slightly larger radii, five-BOM ribbon, pipeline and governance hubs.
- PQC migration guide aligned to local Qiskit taxonomy and optional connectors (not a required IBM Quantum run).

## [1.5.6] - 2026-09-03

### Added
- Client architecture **discover → mitigate → report** on scan intelligence (`client_architecture`, `pqc_readiness`).
- Scan target classes: website, host, IP, server, declared Kubernetes pod (`pod://ns/name[@host]`), declared HSM/TPM/QSIC catalog.
- `GET /api/v1/architecture` and `GET /api/v1/hardware/catalog`.
- High-level SaaS design: [docs/CLIENT_ARCHITECTURE.md](docs/CLIENT_ARCHITECTURE.md).

### Changed
- Community / live GitHub Pages demo is **feature-limited** (no unlabeled Enterprise estate, no DORA pack, no live kube attach).
- OSS edition flags no longer advertise Kubernetes/eBPF as shipped.
- QSIC is declared research hardware inventory, not a shipped or certified module.



### Changed
- Product identity is **RivicQ Security Cloud** (sky-blue/white cryptographic SaaS).
- Removed IBM Plex / Carbon trademark banners from the console, docs hub, marketing, NOTICE, and LEGAL.
- GitHub Pages copies product status, roadmap, architecture, and Qiskit pipeline docs.

## [1.5.4] - 2026-08-19

### Changed
- Restored a **clear sky-blue and white** theme (`#0ea5e9` / `#0284c7` on `#ffffff`). Default mode is light.
- Kept the quieter motion (no glow, blur, or hover-lift).
- Still not IBM Carbon / IBM Plex. Trademark notice is unchanged.

## [1.5.3] - 2026-08-19

### Changed
- Quieted the product theme: dusty violet (`#5a5268` / `#6b6278`) on charcoal surfaces, less saturation than rivicq.com neon.
- Removed glass blur, neon glow, hover-lift, and bouncing motion from the console, homepage, auth, and docs hub.
- IBM trademark notice is unchanged. RivicQ is still not an IBM product.

## [1.5.2] - 2026-08-19

### Changed
- Product theme is RivicQ violet (`#8251f3` / `#301233`) matching rivicq.com, with Outfit + JetBrains Mono.
- Stopped using IBM Carbon colors and IBM Plex as the product design system (IBM ambassador / trademark hygiene).
- Homepage stats no longer claim unproven asset counts or uptime.
- IBM Cloud HPCS no longer defaults status to “Connected”; quantum attestation no longer invents 72/45 scores.

### Security
- Enterprise audit `GetEvent` is scoped to the JWT tenant.

### Legal
- TRADEMARKS.md, LEGAL.md, NOTICE, and in-app notices: IBM, IBM Plex, and Carbon are trademarks of IBM. RivicQ is not an IBM product. Control mappings are not certifications.

## [1.5.1] - 2026-08-19

### Added
- Production legal pack: expanded README (OSS vs Enterprise), LEGAL.md, PRIVACY.md, TRADEMARKS.md, NOTICE, web/README.md.
- IBM Carbon color sweep on remaining UI accents (Green 50 / Blue 60 / Red 60).
- `RequireRole("admin")` on Enterprise SSO and cloud-connector POST routes.
- JWT-only tenant context for API keys and webhooks (no spoofable `X-Tenant-ID`).

### Changed
- CONTRIBUTING.md and docs hub copy: no certification claims for RivicQ itself.
- Docs hub uses Carbon Gray 100 / Blue 60 and honest feature descriptions.

### Security
- API key and webhook mutations scoped to JWT tenant.

## [1.5.0] - 2026-08-19

### Added
- IBM Carbon visual language (Blue 60, Gray 100, Green 50) and IBM Plex Sans/Mono.
- Community vs Enterprise edition cards on Sign-In / Registration.
- Community command center onboarding (no simulated enterprise estate).
- Inventory sort + JSON/PDF export (print-to-PDF, no extra npm dependency).
- Homepage GitHub content scan path; Discover → Analyze → Quantify workflow copy.
- `datasets/` expected-results harness and `make analyze-datasets`.
- `RequireRole` RBAC helper; audit events record JWT tenant and actor.
- LEGAL.md, NOTICE, docs/KNOWN_LIMITATIONS.md, DATASETS.md.

### Changed
- Tenant isolation: Enterprise audit APIs no longer accept spoofable `X-Tenant-ID`.
- Auth forms: field-level email/password validation.

### Security
- Production authentication unchanged. Demo tokens are not JWTs on Pages.

## [1.3.0] - 2026-08-12

### Changed
- Restructured the repository: removed redundant internal planning docs, database dumps, committed binaries, and archived demo fixtures.
- Streamlined `README.md` and added `docs/README.md` plus `docs/editions.md` as the canonical documentation index.

## [1.2.0] - 2026-08-08
- Redesign the full web platform with a minimal light-first enterprise theme
  (indigo/emerald accents, light surfaces, dark-mode toggle preserved).
- Default the app to light mode (`App.tsx`) and rebuild the MUI design system
  (`web/src/theme/tokens.ts`, `web/src/theme/theme.ts`).
- Rebuild the app shell: grouped navigation, collapsible Security Modules section,
  topbar search, edition chip, user menu (`web/src/layouts/Layout.tsx`).
- Rework landing, auth, edition switcher, dashboard, and enterprise pages to the
  new light-first design.
- Complete the Security Modules `SEEDS` catalog: add Cloud Security, Runtime Security,
  Network Security, Detection Engineering, Digital Forensics, and Red Team seeds
  (`web/src/config/modules.ts`).
- Clean up lint warnings in redesigned files; type-check and production build pass.

## [1.1.0] - 2026-05-22
- Remove runtime demo endpoints and seeded fallback data (frontend and backend).
- Add CSPM Control Center scaffold and UX updates for edition gating.
- Neutralize demo dashboard and remove file-coupling from build/run scripts.
- Fix enterprise build issue (sharedapi -> shared) and other build/test fixes.
- Archive demo fixtures to `docs/archive/demo-fixtures` and update demo docs.
- Add deployment env docs (`docs/DEPLOY_ENV.md`).
- Make demo smoke CI job manual to avoid accidental demo runs during PRs.
- Add lightweight IBMQ mock server for local CI/dev use (demo/mock-ibmq).
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-beta1] - 2026-03-12

> **Enterprise MVP – Beta Release**  
> CryptoBOM SaaS is now feature-complete for client beta testing. This release introduces
> end-to-end CBOM scanning, Enterprise multi-cloud capabilities, and a beta sign-up programme.

### 🔐 Headline: CBOM Scanning End-to-End

- **`POST /api/v1/scans`** – New headleap CBOM scan endpoint. Accepts any target (repo path,
  container image, hostname) and triggers a full cryptographic inventory scan.
- **`GET /api/v1/scans/{id}`** – Poll scan status, progress, and summary findings.
- **`GET /api/v1/assets/{id}/bom`** – Retrieve the Cryptographic Bill of Materials for a
  specific asset. Returns algorithm, key size, library, risk level, quantum-safe flag,
  PQC status, location, and BSI TR-02102-1 reference for each component.
- **`scripts/scan-cbom.sh`** – CLI entrypoint for the headleap developer CBOM scan flow.
  Supports any target, scan type, and output path. Falls back to demo mode when the
  backend is unavailable.
- **`QUICKSTART_CBOM.md`** – Complete 5-minute quickstart guide covering CLI, REST API,
  and Web UI scan flows.
- **Scanner UI** – Updated `Scanner.tsx` with a CBOM scan type, scan-target input field,
  and per-job target display. Uses the new `/api/v1/scans` API directly.

### 🌐 Enterprise MVP Completeness

- Enterprise pages for multi-cloud (GCP / AWS / IBM), Quantum, Compliance, CNCF,
  and Terraform are integrated in the frontend (`web/src/pages/enterprise/`).
- Backend Enterprise endpoints (IBM HPCS, AWS CloudHSM, quantum attestation, compliance
  report generation) compile and gracefully degrade when cloud credentials are absent.
- Edition / licence gating is enforced via `internal/edition/edition.go` – OSS vs Enterprise
  is clearly delineated in both backend and frontend.

### 🚀 Beta Sign-Up and Onboarding

- **`BETA_PROGRAM.md`** – Full beta programme description: who it's for, included features,
  security posture, onboarding process, Beta → GA roadmap, and FAQ.
- **`BetaBanner`** component – Dismissible in-app banner on the OSS Dashboard inviting
  users to join the Enterprise beta. Links to GitHub Discussions.

### 📋 Documentation

- `QUICKSTART_CBOM.md` – Headleap developer CBOM scan quickstart (CLI + API + UI).
- `BETA_PROGRAM.md` – Beta programme and onboarding guide.
- `PROJECT_STATUS.md` – Updated to reflect Enterprise MVP feature-complete status.
- `MVP_COMPLETED.md` – Updated to reflect v1.0.0-beta1 readiness.
- `MVP_ROADMAP.md` – Beta vs GA feature distinction added.
- `README.md` – CBOM scanning highlighted as headline feature; beta enrolment link added.
- `VERSION` – Bumped to `1.0.0-beta1` (Enterprise edition).

### Known Limitations (Beta)

- IBM Quantum attestation requires a valid IBM Quantum Network API key.
  Without credentials the system falls back to classical risk scoring (all other features
  remain fully functional).
- Multi-cloud HSM scanning requires cloud credentials configured in Kubernetes secrets.
- Production SLAs begin at GA. Beta support is best-effort.
- SOC 2 Type II and ISO 27001 certifications are planned for GA.

---


## [v0.1.0] - 2026-02-15

### Added
- 🔐 **CBOM Scanner** - Discover cryptographic assets in Kubernetes, containers, and repositories
- 📊 **Algorithm Analysis** - Detect RSA, AES, ECDSA, and other cryptographic algorithms
- ⚛️ **Quantum Vulnerability Detection** - Identify quantum-vulnerable algorithms
- 📋 **Compliance Scanning** - NIST, ISO, BSI, PCI-DSS, SOC2 framework support
- 🛡️ **DevSecOps Integration** - CI/CD pipeline assessment
- 🔄 **PQC Migration Planning** - Generate migration plans to NIST PQC algorithms
- 🐳 **Docker Compose** - Full stack deployment with Go, Node, Python
- 📝 **Examples** - scan.py, upgrade.go, risk_compliance.py scripts
- 🧪 **Full Test Suite** - Unit and integration tests
- 📚 **OpenAPI Specification** - Full API documentation
- 📄 **Apache 2.0 License** - Open source license with RivicQ IP supplement

### Features
- Asset discovery via Kubernetes, eBPF, network scanning
- Real-time quantum vulnerability assessment
- Compliance report generation (JSON)
- Post-quantum migration planning
- Multi-language SDK support (Python, Go)
- Enterprise IBM Quantum integration (Enterprise Edition)

### Architecture
- Clean architecture with separation of concerns
- RESTful API design
- Modular quantum provider system
- DevSecOps-ready deployment configurations

### Quick Start
```bash
# Docker Compose
docker compose up -d

# Scan for cryptographic assets
python examples/scan.py --target all --output cbom.json

# Check compliance
python examples/risk_compliance.py --framework NIST

# Generate migration plan
go run examples/upgrade.go --output migration-plan.json
```

### Binary Release
Pre-built binaries available:
- `bin/cryptobom-oss-v0.1.0` - Linux amd64
- Docker image: `rivicq/cryptobom-oss:v0.1.0`

---

## [v1.3.0] - 2026-02-12

### Added
- Initial release with full DevSecOps integration
- IBM Quantum and KIPU Q-CTRL integration
- Multi-language SDKs (Python, Java, Rust, C++, C, Ruby)
- TÜV-certified German engineering
- Enterprise SSO (SAML/LDAP/OAuth)

---

## Upcoming Features

### v0.2.0 (Planned)
- [ ] Real IBM Quantum hardware integration
- [ ] Enhanced dashboard with real-time metrics
- [ ] More compliance frameworks
- [ ] Webhook support for CI/CD
- [ ] Plugin system for custom providers

### v0.3.0 (Planned)
- [ ] Machine learning-based threat prediction
- [ ] Automated remediation workflows
- [ ] Enhanced reporting with PDF export
- [ ] Multi-cluster support

---

## Acknowledgments

- IBM Quantum for quantum computing integration
- NIST for PQC standardization
- Open source community

---

**© 2026 RivicQ GmbH - LEAP BERLIN - Rudower Chaussee 29, 12489 Berlin**
**German Engineering Excellence in Quantum-Safe Cryptography**
