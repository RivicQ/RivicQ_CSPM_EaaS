# RivicQ Implementation Report

Date: 2026-08-15

This work **extends** the existing RivicQ platform. No existing routes, pages, APIs, or dashboards were removed.

---

## Existing features preserved

- All frontend routes in `web/src/App.tsx` (login, register, dashboard, assets, scanner, analytics, settings, enterprise pages, modules)
- Sidebar navigation items and grouping (Workspace / Enterprise / Security Modules)
- CBOM scan engine (`internal/discovery`) and `/api/v1/scans*`
- Inventory, QBOM, OAuth, MFA backend, demo login endpoint
- Existing dashboards, charts, and theme tokens
- GitHub OAuth login (separate from repo scanning)
- CI/CD and GitHub Pages workflow files (unchanged)
- Scanner CBOM tabs (New Scan, History, Findings, Schedules, Benchmarks)

## Feature matrix

| Area | Classification |
|------|----------------|
| Dashboard / Command Center | EXISTING — EXTEND (CSPM welcome copy) |
| Home / Auth welcome | EXISTING — EXTEND (CSPM product name) |
| Layout / sidebar | EXISTING — EXTEND (collapse, motion, mobile bottom nav) |
| Registration | EXISTING — EXTEND (first/last name, org profile, terms) |
| Demo login `GET /auth/demo` | EXISTING — EXTEND (env-configurable identity; disable via `DEMO_MODE=false`) |
| GitHub repo listing | EXISTING — EXTEND (real API; demo fixture list when no token) |
| GitHub repo scan | BROKEN (stub findings) — FIX: real Contents/Tree analysis |
| GitHub scan status | BROKEN (always completed) — FIX: queued job + pollable stages |
| GitHub scan history/compare | MISSING — ADD (`GET /github/scans`, `GET /github/scans/:id/compare`) |
| GitHub webhooks | EXISTING — EXTEND (push/PR queues a content scan) |
| Scanner UI | EXISTING — EXTEND (GitHub tab) |
| Settings | EXISTING — EXTEND (GitHub section) |
| Enterprise `/github/*` routes | MISSING — ADD (same handlers as OSS) |
| Desktop collapse sidebar | MISSING — ADD |
| Mobile bottom nav | MISSING — ADD |
| Full CodeQL/Semgrep CLI | OPTIONAL — FUTURE |
| GitHub App (vs PAT) | OPTIONAL — FUTURE (PAT + OAuth remain; App is next) |

## Desktop UX

- Persistent sidebar on `lg+` (1280px+)
- Collapse/expand to a 76px icon rail with tooltips
- Width animation respects `prefers-reduced-motion`
- Collapse state stored in `localStorage` (`rivicq.sidebar.collapsed`)
- Multi-column dashboards unchanged; tables scroll inside containers

## Tablet UX

- Temporary navigation drawer (not a squeezed desktop rail)
- 44px touch targets on nav items
- Responsive stacked GitHub scan controls
- Registration fields split into two columns from `sm` up

## Mobile UX

- Hamburger drawer + bottom navigation (Command Center, Assets, Scanner, Analytics)
- Search hidden below `md`; edition chip hidden below `sm`
- Page padding for the bottom bar
- GitHub findings render as cards (severity → evidence → remediation)

## Authentication

- Registration still uses `POST /auth/register`
- Extra JSON fields (`first_name`, `last_name`, `organisation`, `job_title`, `country`, `industry`, `organisation_size`, `accept_terms`) are accepted without breaking old clients
- MFA, Google, and GitHub OAuth login are unchanged
- Dead unreachable JSON after GitHub OAuth redirect was removed; the live path remains the frontend redirect

## Demo environment

- `DEMO_MODE` (default on) controls `GET /auth/demo`
- `DEMO_CISO_EMAIL` / `DEMO_CISO_NAME` configure the demo identity
- **No production password is hardcoded.** Demo session is issued by the existing demo endpoint
- GitHub scans without `GITHUB_TOKEN` analyze **embedded fixture files** (`internal/api/shared/testdata/demo-repo/`). Findings are marked `demo=true`

## GitHub integration — real scanning

Pipeline (actual file content, not invented CVEs):

1. `POST /github/scan` queues a background job (`status=queued`) and returns `scan_id`
2. Worker fetches repository metadata (`GET /repos/{owner}/{repo}`)
3. Git tree (`GET /repos/.../git/trees/{branch}?recursive=1`)
4. File discovery (language/manifest filters)
5. Content fetch (`GET /repos/.../contents/{path}`)
6. SAST-style crypto/hash/cipher rules on source
7. SCA from `package.json`, `go.mod`, `requirements.txt` → SBOM components
8. Curated advisory overlay only for **exact** known versions (e.g. lodash@4.17.20 → CVE-2021-23337)
9. Secret detection (masked evidence)
10. Dockerfile + Terraform IaC rules
11. OpenAPI/Swagger discovery (not claimed as a full API pentest)
12. CBOM algorithms from detections
13. PQC readiness = quantum-safe crypto findings / crypto findings
14. OWASP/CWE + control mapping (NIST/BSI/CRA/NIS2) on each finding
15. `GET /github/scans/:id` reports **completed analyzer stages** (not a percent timer)
16. `GET /github/scans/:id/compare?against=` diffs new / resolved / unchanged findings by file+type+algorithm

If a scan fails, status is `failed` with an error — never “Scan complete”.

## CISO / Dashboard

- Welcome hero eyebrow and subtitle now name **Cryptographic Security Posture Management**
- Home marketing chip and Auth welcome panel use the same product name
- Existing Command Center metrics/charts are preserved
- GitHub scan scores are derived from analyzer summaries (finding counts, PQC %, file counts)

## AI

- Existing assistant panels are unchanged
- GitHub findings include evidence, OWASP, CWE, and remediation for AI explanation — scanners remain deterministic

## CI/CD

- Existing GitHub Actions (CI, CodeQL, DAST, Pages) were not replaced
- New unit tests run under `go test ./internal/api/shared/`

## Testing

```
go test ./internal/api/shared/ -count=1
go test ./internal/discovery/ -count=1
```

Acceptance fixture test: `TestAnalyzeRepositoryFiles_DemoFixtureProducesEvidence` asserts secrets, crypto, IaC/container, SCA CVE overlay, API discovery, SBOM, CBOM, and compliance mapping from real fixture files.

`TestCompareGHScans_DetectsNewFinding` asserts scan-history comparison on actual analyzer output.

## Security

- Secrets in the UI are masked
- Demo credentials are env-driven; no production password in source
- GitHub token stays server-side (`GITHUB_TOKEN`)
- Least-privilege note: PAT is still used; GitHub App is remaining work

## Performance

- GitHub content scan runs in a background goroutine with a 3-minute timeout
- File fetch is capped (40 files default, 80 deep) and 512 KiB per file
- Job store keeps the last 50 scans in memory

## GitHub push status

Recorded after commit/push in this session.

## Remaining work (optional / future)

- GitHub App installation flow (least-privilege vs PAT)
- Incremental file-diff rescans by commit SHA
- Full OSV/NVD SCA feed (current overlay is exact-version only)
- SARIF export / CodeQL CLI in CI
- Wire Settings MFA switch to `/auth/mfa/setup`
- Dedicated CISO metrics page fed only from scan evidence (dashboard still uses mixed live + fallback inventory)
- E2E three-device visual QA in a browser farm
- Persistent scan history in PostgreSQL (in-memory job store today)
