# RivicQ Ops Runbook — local demo & developer operations

This runbook is the single source of truth for standing up, running, scanning with, securing, and
deploying RivicQ. It supersedes older port/credential references that point at legacy `:8080`.

Operating assumptions (verified against `main`):

| Layer | Default | Config source |
| --- | --- | --- |
| OSS / Community backend | `http://localhost:9090` | `CRYPTOBOM_PORT` (see `Makefile`) |
| Enterprise backend | `http://localhost:9090` | `CRYPTOBOM_PORT` |
| Frontend (dev) | `http://localhost:3000/platform/` | `web/.env.development` (`PUBLIC_URL=/platform`) |
| Health | `GET /healthz` | — |
| Edition rendering | `GET /edition` | — |
| API prefix | `/api/v1` | — |

> Legacy note: port `:8080` was the old OSS default and is now **squatted by an unrelated
> application** on many machines (it redirects `/` → `/account` and is not RivicQ). All
> orchestrators here bind to `:9090`. The frontend probes its configured API URL first, then
> `:8080`, then `:9090` (see `web/src/config/editions.ts`), so a squatted `:8080` never
> breaks edition detection.

## 1. One-command local stack

```bash
./scripts/dev-stack.sh        # OSS backend :9090 + frontend :3000
./scripts/dev-stack.sh enterprise   # Enterprise backend :9090 (needs license key)
./scripts/dev-stack.sh docker       # Docker Compose stack
```

Run it in **your own terminal** — the script owns the processes and kills stale dev servers first.
Equivalent split commands:

```bash
make build-oss && make dev-backend          # backend on :9090 (terminal #1)
cd web && npm run dev                       # frontend on :3000 (terminal #2)
```

Keep `.env` seeded (see §2); the backend refuses to start with a bootstrap password shorter than
12 characters.

## 2. Credentials

All seeded users share the bootstrap password in `.env`:

| Role | Email |
| --- | --- |
| Admin | `admin@rivicq.com` |
| Operator | `operator@rivicq.com` |
| Analyst | `analyst@rivicq.com` |
| Sales/Read-only | `sales@rivicq.com` |

`.env` is gitignored (`.gitignore:98`) — only `.env.demo` / `.env.example` are tracked templates.
Key values:

```bash
AUTH_BOOTSTRAP_EMAIL=admin@rivicq.com
AUTH_BOOTSTRAP_PASSWORD=<your ≥12-char password>
JWT_SECRET=<≥32-char dev secret>
CRYPTOBOM_PORT=9090
# Demo-scanning convenience (default OFF in production):
RIVICQ_SCAN_ALLOW_PRIVATE_NETS=true
RIVICQ_SCAN_ALLOW_LOCAL_PATHS=true
```

Changing the password in `.env` requires restarting the backend; the frontend can now boot with
any reachable/editable setup (see §5 — it never deadlocks on an unreachable auth provider).

## 3. Scanning (API)

Authenticate once, then drive scans. The returned token also works across edition switches.

```bash
BASE=http://localhost:9090/api/v1
TOKEN=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@rivicq.com","password":"<pw>","edition":"oss"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
```

### Login → scan → poll → findings (end-to-end)

```bash
SCAN=$(curl -s -X POST "$BASE/scans" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"target":"https://example.com","scan_type":"website"}')
SCAN_ID=$(echo "$SCAN" | python3 -c 'import sys,json;print(json.load(sys.stdin)["scan_id"])')
echo "$SCAN"                       # ScanResponse: scan_id, status=running, … (returns WITHOUT polling in OSS)

curl -s "$BASE/scans/$SCAN_ID" -H "Authorization: Bearer $TOKEN"     # status: running → completed
curl -s "$BASE/scans/findings" -H "Authorization: Bearer $TOKEN"     # findings for all completed scans
curl -s "$BASE/findings"         -H "Authorization: Bearer $TOKEN"   # same intelligence pipeline
```

Result shape (OSS scan of `example.com`): 8 rows / 4 unique findings —

| Severity | Finding | Rationale |
| --- | --- | --- |
| medium | HSTS header missing | TLS posture |
| low | X-Content-Type-Options missing | response hardening |
| low | X-Frame-Options missing | clickjacking protection |
| low | CSP missing | injection hardening |

Findings rows include `id`, `severity`, `title`, `asset`, `algorithm`, `evidence`, `remediation`,
`host`, `port`, `protocol`, `bsi_ref`. The detail panel in the app explains *classification vs
vulnerability* — RSA-2048 is flagged as classical crypto, not automatically vulnerable.

### Supported scan types & resources

From `GET /edition` → `scan_targets`:

| `scan_type` | `target` example | Resources checked |
| --- | --- | --- |
| `website` | `https://example.com` | tls, https |
| `host` / `ip` | `host.example.com` / `10.0.0.5` | tls, ssh, http |
| `server` | `https://server.company.com` | tls, ssh, http |
| `path` | `/path/to/project` | local SBOM intake (`RIVICQ_SCAN_ALLOW_LOCAL_PATHS`) |
| `pod` | k8s workload | k8s (live attach is Enterprise) |
| `hardware` | declared model | hardware catalog (provenance declared, not reverse-engineered) |

### CSV export

The Findings page exports the filtered/selected rows client-side as `rivicq-findings.csv`.
The raw pipeline already exposes the same columns over `GET /api/v1/scans/findings`.

## 4. Frontend editions & API probing

`web/src/config/editions.ts` builds the probe list as:

```text
[configuredAPIPort(), OSS_PORT(8080), ENTERPRISE_PORT(9090)]  (deduped, env-first)
```

`configuredAPIPort()` parses `REACT_APP_API_URL`; dev env points it at `:9090`, so no probing
needed in the common case. The probe-hit fake (a non-RivicQ service on stale `:8080`) is
recognized and skipped because it does not return the expected edition payload.

## 5. NetworkError / boot deadlocks — root causes & fixes

| Symptom | Cause | Fix |
| --- | --- | --- |
| `auth/login` → `Fatal` on startup | Bootstrap password < 12 chars | Set ≥12-char `AUTH_BOOTSTRAP_PASSWORD`, restart |
| `NetworkError when attempting to fetch resource` | Stale dev-server bundle (started before the Auth guard); or no backend on `:9090` | Kill stale `react-scripts`, restart via `scripts/dev-stack.sh`; backend must be up on `:9090` |
| Edition detection stuck | Squatted `:8080` returning an RFC7807 page | None needed — probe recognizes and skips it |
| Supabase unreachable at boot | Charts/auth provider offline | Guarded since `fix(ui)`: `AuthContext` try/catch + graceful fallback to demo/loading |
| Backend dies with the shell | Server started from a tool session that ended | Start it in your own terminal (`make dev-backend`) |

## 6. Security hardening applied on `main`

| Area | Change | Env override |
| --- | --- | --- |
| Bootstrap auth | Min 12-char password + actionable Fatal message | `AUTH_BOOTSTRAP_PASSWORD` |
| Trusted proxies | `SetTrustedProxies` from env, CIDR-aware split | `TRUSTED_PROXIES` |
| CORS | Explicit allowlist, no `*` default; local-dev origins opt-in | CORS endpoints list |
| Audit | Query string redaction (`redactQuery`), sensitive keys never logged | — |
| Request logs | Removed `gin.Logger` (prevents token/header leakage into logs) | — |
| Demo dashboard | Deterministic, labeled `simulated` inventory; no fake claims | — |

Unit coverage: `cors_test.go`, `audit_test.go`, `store_test.go` (short-password refusal).

## 7. CI/CD & Pages deployment

- Pushes to `main` run: `CI` (build/vet/gofmt/-short tests; Go + Node + eslint + tsc), `Docker
  Image CI`, `CryptoBOM SaaS CI/CD Pipeline`, Sec gates, and `Deploy GitHub Pages`.
- `pages.yml` builds `web/` with the production env baked in and **force-pushes the site to the
  `gh-pages` branch** via `peaceiris/actions-gh-pages@v4` (`force_orphan: true`). The repo's
  built-in "pages build and deployment" builder also fires on `gh-pages` pushes; **its failure is
  cosmetic** — the served site comes from the workflow deploy (verified: live bundle contains
  current UI strings, served with HTTP 200).
- CI gate (`gofmt -l`) must stay clean: run `gofmt -w` on Go changes before pushing.
- Live site to verify after a deploy:
  `curl -sI https://rivicq.github.io/RivicQ_CSPM_EaaS/` → `200`.

## 8. Roadmap pointers

Full detail: `docs/ROADMAP.md`, `docs/PRODUCT_STATUS.md`, `docs/ENGINEERING_AUDIT.md`,
`docs/KNOWN_LIMITATIONS.md`. Honesty invariants (enforced):

- Detection ≠ vulnerability (classification is explicit).
- No firmware reverse-engineering claims; hardware catalog is declared inventory.
- Mappings are mappings, not certifications.
- QSIC is a research ASIC declaration, not shipped silicon.