# Decisions Log

Significant design decisions recorded with their rationale, alternatives rejected, and the code that implements them. Detailed ADRs live in `docs/adr/` (see `docs/adr/adr-001-database.md`, `docs/adr/adr-002-frontend.md`); this file is the running, dated index. In the spirit of the repo, every decision below is evidenced by source paths, and nothing here claims a certification it does not have.

| # | Date | Decision | Rationale | Implements | Alternatives rejected |
|---|---|---|---|---|---|
| 1 | 2025 | One codebase, two binaries (OSS `:8080`, Enterprise `:9090`) with a shared `internal/` engine | Feature parity without branch divergence; CI oss-gate enforces the split | `cmd/server/oss/main.go`, `cmd/server/enterprise/main.go`, `.github/workflows/ci-cd.yml` oss-gate | Two full repos; feature flags in one binary (weakened OSS integrity) |
| 2 | 2025 | Edition detection at runtime via `CRYPTOBOM_LICENSE_KEY` (`ENT-`, >= 20 chars) | License-delivered enterprise features w/o rebuild; demo stays OSS | `internal/edition/edition.go` | Compile-time build tags as the only gate |
| 3 | 2025 | Go (Gin) backend, PostgreSQL >= 15 optional, in-memory demo store otherwise | Fast local + CI without heavy deps; prod-grade persistence opt-in | `internal/server/server.go`, `internal/database`, `docker-compose.yml` | Required Postgres for demo (slower onramp) |
| 4 | 2025 | JWT `tenant_id` is the only tenant source of truth; `X-Tenant-ID` never trusted | Header-based tenancy is spoofable; claims bind to signed identity | `internal/tenant/context.go`, auth middleware | Trusting an org header |
| 5 | 2025 | Public tenant `00000000-0000-0000-0000-000000000001` for unauthenticated Community access | Home/CBOM pilot usable before signup while staying bounded | `internal/tenant/context.go`, `internal/api/shared` handlers, `tests/api_test.go` | Requiring auth for every public read |
| 6 | 2025 | `discovery.ScanResult` is the frozen core report contract | One result shape shared by API, CLI, dashboard, and datasets | `internal/discovery/scanner.go`, `docs/CORE_ENGINE.md` | Per-edition report models |
| 7 | 2025 | Passwords stored as bcrypt hashes, single-use tokens header as SHA-256 digests | Compromise-resistant at rest: raw secrets never stored | `internal/authn/password.go`, migration 0008 `auth_tokens`/`auth_sessions` | Plaintext/encrypted-at-rest tokens |
| 8 | 2025 | Middleware default: trust no proxies unless `TRUSTED_PROXIES` set | Protects audit + rate limit from header spoofing by default | `internal/middleware/middleware.go` | Trusting `X-Forwarded-For` by default |
| 9 | 2025 | Scanner egress policy blocks private/loopback/cloud-metadata by default; local fs off | Safety-first scanning that cannot exfiltrate or probe internal networks | `internal/discovery/target_policy.go`, `safe_dial.go` | Unrestricted target scanning (dangerous defaults) |
| 10 | 2025 | HTTP scanner reads at most 1 KiB of one root response | RFC-polite, minimal-footprint web checks; no crawling | `internal/discovery/http_scanner.go`, `docs/SCRAPING.md` | Full web crawler (footprint, liability) |
| 11 | 2025 | GitHub scanning: bounded tree (40/80), 512 KiB files, HMAC webhooks, replay cache, 8 MiB cap, concurrency 4 | Practical scan depth with live-secret and DoS protections | `internal/api/shared/github_scanning.go` | Unbounded content pulls |
| 12 | 2025 | Optional external tools (Syft/Trivy/Grype/Gitleaks/OSV) integrated via adapter, disable-able | Standard ecosystem tools without hard runtime deps | `internal/intelligence/adapters_external.go`, `RIVICQ_EXTERNAL_TOOLS` | Reimplementing every scanner in-house |
| 13 | 2025 | Compliance frameworks implemented as control mappings, never "certified" labels | Honest positioning; product does not hold the certifications | `internal/compliance/engine.go`, `docs/SECURITY_CONTROL_MATRIX.md`, UI/copy/PDF label rules | Claiming certification (false advertising) |
| 14 | 2025 | Warm, on-brand neutral admin design: RivicQ violet primary, Inter + JetBrains Mono, pill radii, glow used sparingly (v1.6.x rebrand) | Cohesive product identity; stopped IBM Carbon/Plex look | `web/src/theme/tokens.ts`, `CHANGELOG.md`, `docs/DESIGN_SYSTEM.md` | IBM Carbon/Plex continuation |
| 15 | 2025 | Public site built statically to `gh-pages`; demos labeled and synthetic | Zero backend/surface on Pages; no raw secrets possible | `.github/workflows/pages.yml`, `docs/GITHUB_ACTIONS_AND_PAGES.md`, `fabric/` | Hosting a live API behind Pages |
| 16 | 2025 | Firmware/identity analysis is static + evidence-bound (size caps, RBAC, no execution) | Roadmap-scoped embedded analysis stays safe and honest | `internal/firmware/limits.go`, `internal/identity`, `docs/FIRMWARE_ANALYSIS.md` | Firmware runtime reverse-engineering (scope creep) |
| 17 | 2025 | Migration ledger: append-only, idempotent, checksum-guarded | Safe schema evolution across deployments | `internal/database/migrations.go`, `internal/database/migrate.go` | Editable/auto-DDL migrations |
| 18 | 2025 | Frontend code-splits routes and centralises queries (react-query) with explicit auth guards | Keeps community SPA fast and secure on static hosting | `web/src/App.tsx`, `web/src/context/AuthContext.tsx`, `web/src/services/api.ts` | One big bundle / per-page fetch sprinkles |

## How to add a decision

- Decide: architecture, errata, or behavior change -> a numbered row here plus `docs/adr/adr-NNN-*.md` if it is weighty.
- Evidence rule: link to the implementing file path; note the tested behavior (`docs/TESTING.md`).
- Deliberately non-secret decisions only: no tokens, no customer names, no internal choices that would reduce operational security if published.