# RIVICQ_BASELINE.md

**Baseline date:** 2026-10-05
**Baseline commit:** `82a6785` — *feat(cspm): move Q/H/AI/I BOMs to Enterprise and restyle nebula CSPM*
**Module:** `github.com/rivic-q/cryptobom-saas` (Go 1.26.0)
**Edition:** OSS (default) / Enterprise (license-gated)
**Method:** Full repository inspection, build verification, `go vet`, and targeted source review. Every claim below cites a file and line range. Anything not verified is marked **UNVERIFIED**.

---

## 1. Honest self-assessment

| Area | Current | Target this cycle |
|---|---:|---:|
| Architecture | 68/100 | 80+ |
| CBOM | 74/100 | 85+ |
| Multi-tenancy | 74/100 | 90+ |
| PQC taxonomy | 70/100 | 85+ |
| Authentication | 64/100 | 85+ |
| Scanner accuracy | 58/100 | 80+ |
| Production readiness | 40/100 | 75+ |
| **Overall** | **58/100** | **80+** |

These are **starting estimates to be falsified**, not validated measurements. The only measured numbers in this document are the ones produced by tools (build, vet, test inventory, file/LOC counts). Accuracy benchmarks did not exist at baseline; §7 explains what was missing.

---

## 2. Repository shape (verified)

```
go files (tracked):      164        34,773 LOC
ts/tsx files (tracked):  253        32,313 LOC
*_test.go files:          40
tracked files total:     684
go build ./...:          PASS (exit 0)
```

### Backend package sizes (tracked Go files / LOC)

| Package | Files | LOC | Role |
|---|---:|---:|---|
| `internal/api` | 40 | 12,971 | All HTTP handlers (shared / oss / enterprise) |
| `internal/discovery` | 16 | 3,674 | Network probe + SBOM scanners, scan manager |
| `internal/quantum` | 19 | 3,788 | PQC providers, NIST taxonomy, attestation, plugins |
| `internal/intelligence` | 17 | 2,424 | Normalization, fingerprint, risk, policy, CycloneDX |
| `internal/database` | 3 | 1,287 | Raw `database/sql` + lib/pq, inline migrations |
| `internal/auth` | 9 | 1,567 | JWT, MFA, RBAC, user stores |
| `internal/platform` | 7 | 969 | Leads, billing stubs, public snapshots |
| `internal/config` | 3 | 562 | dotenv + largely inert YAML-tagged structs |
| `internal/intel. / compliance / controls` | 6 | 841 | Compliance engine, checklists |
| `internal/cilium / awscloud / azurecloud / gcpcloud / ibmcloud / hardware / edition / server / operator / observability / core / tenant / benchmarks` | 18 | 3,310 | Integrations and support |

**Structural finding:** `internal/api` is 37% of the Go codebase and contains both HTTP plumbing *and* business logic (asset normalisation, risk aggregation, tenant resolution, demo data synthesis). Handlers call `db.Exec` with hand-written SQL in many places. This is the primary architectural debt (§5.1).

### Frontend

`web/` — React 18 + TypeScript + MUI 5 + Vite, `react-scripts` 5.0.1 present **and** Vite. 11 frontend test files. `web/src/components/dashboard/` alone contains 20 chart/panel components. No design-system token enforcement was found in the baseline; styling is per-component with mixed MUI `sx` and CSS modules.

### Entrypoints (verified)

| Entrypoint | Purpose | Notes |
|---|---|---|
| `cmd/server/main.go` | Canonical server | 9-line shim → `internal/server.New()` |
| `cmd/server/oss/main.go` | Standalone OSS server | **Duplicate bootstrap**, bypasses `middleware.Setup` |
| `cmd/server/enterprise/main.go` | Standalone Enterprise server | **Duplicate bootstrap**, installs OTEL the canonical path lacks |
| `cmd/rivicq/main.go` | Offline CLI (`scan`, `sbom`, `cbom`, `vuln`, `secrets`, `iac`, `compliance`, `policy`) | No HTTP surface |
| `cmd/scanner/main.go` | Remote scan client | 82-line submit-and-poll loop |
| `cmd/demo-scanner/main.go` | Demo data generator | — |

Three divergent HTTP bootstraps is a production blocker (§9, B-2).

---

## 3. Request pipeline (verified)

`internal/middleware/middleware.go:10-24`, in order:

1. `RequestID()` — `requestid.go:8-17`
2. `SecurityHeaders()` — `security.go:9-32`
3. `Audit(logger, db)` — `audit.go:12-64`
4. `RateLimit(editionCfg.Features.APIRateLimit)` — `ratelimit.go:70-87`
5. `CORS(DefaultCORSConfig())` — `cors.go:41-92`
6. Edition header writer — `middleware.go:18-21`

Then per edition: `oss.SetupRoutes` (`internal/api/oss/handlers.go:17`) or `enterprise.SetupRoutes` (`internal/api/enterprise/handlers.go:27`), both of which first call `shared.SetupStandardAuth`, which installs:

```go
// internal/api/shared/standard_auth.go:128
router.Use(authService.OptionalJWTAuthMiddleware())
```

Root routes outside `/api/v1`: `GET /healthz`, `GET /readyz`, `GET /edition`, `GET /openapi.json` (`internal/server/server.go:104,125,141,183`).

---

## 4. Authentication (verified)

### 4.1 Token implementation — `internal/auth/jwt.go`

| Property | Baseline value | Evidence |
|---|---|---|
| Algorithm | HS256 (symmetric) | `jwt.go:207`, `:231` |
| Alg-confusion defence | Present, correct (`*jwt.SigningMethodHMAC` assertion) | `jwt.go:237-242` |
| Access TTL | 1 hour | `jwt.go:178` |
| Refresh TTL | **30 days** | `jwt.go:179` |
| Issuer | `cryptobom-saas` (access), `cryptobom-saas-refresh` | `jwt.go:203`, `:228` |
| Issuer validated on parse | **No** | `jwt.go:236-257` validates signature + expiry + blacklist only |
| Audience | **Absent** from claims | `jwt.go:19-28` |
| Token-type claim | **Absent** — access and refresh tokens are the same `Claims` type | `jwt.go:186-233` |
| Claims | `user_id`, `tenant_id`, `email`, `role`, `edition`, `permissions` | `jwt.go:19-28` |
| Refresh claims | Carries **no** `edition`/`permissions`; rotation preserves the *old* token's edition | `jwt.go:218-233`, `:289` |
| Revocation store | In-process `map[string]time.Time` | `jwt.go:43-64` |
| MFA challenge store | In-process | `jwt.go:75-110` |
| Password-reset token store | In-process, tokens stored SHA-256 hashed | `jwt.go:118-163` |

**Consequences, all verified:**
- An access token is accepted by `/auth/refresh`, converting a 1-hour token into a 30-day refresh chain.
- Restart clears all revocations. Multi-replica deployments honour revocation on exactly one replica.
- Rotating cannot correct an edition change.

### 4.2 Secret handling — `internal/api/shared/standard_auth.go:17-54`

```go
const defaultJWTSecret = "oss-default-secret-not-for-production"
```

`resolveJWTSecret` **fails closed in production** — good. But:
- No entropy/length requirement. `JWT_SECRET=a` is accepted in production.
- Production is detected from `CRYPTOBOM_ENV`/`RIVICQ_ENV`/`ENV` ∈ {prod, production} **or** `gin.Mode() == gin.ReleaseMode`. `config.LoadEnterprise` sets `Server.Mode = "release"` in its own struct but never applies it to `gin.SetMode` (`internal/config/oss.go:220`). Arming the guard reliably requires the env var.
- Bootstrapped admin defaults to `admin@rivicq.local` / `DemoPass123!` (`standard_auth.go:63-78`). Production correctly `Fatal`s on the default password (`standard_auth.go:88-90`) — but only when the DB user table is empty.

### 4.3 Login and password handling — `internal/auth/jwt.go:497-562`, `:389-397`, `:572-582`

- Hashing: bcrypt, `DefaultCost` (10). No pepper. (`jwt.go:573-576`)
- MFA is enforced server-side and cannot be bypassed by a request flag (`jwt.go:521-527`). Challenge is single-use, 10-minute, email-bound, mutex-guarded (`jwt.go:85-110`). **This is correct.**
- Password policy: `len >= 8` only. No complexity, no similarity/breach check. (`jwt.go:392-397`)
- Brute force: **no lockout, no per-account throttle, no CAPTCHA.** Only the per-IP limiter.
- HTTP layer returns a uniform `"Invalid credentials"`, but `registerHandler` echoes `err.Error()` (`internal/api/shared/auth.go:232-236`), enabling account enumeration on registration.
- OAuth-provisioned accounts get `Password: fmt.Sprintf("google-oauth-%s", googleUser.Sub)` (`internal/api/shared/google_oauth.go:216`) — a derivable password.
- Login `/register` accepts a client-supplied `edition` (`auth.go:95`, `auth.go:168`) that flows straight into the JWT `edition` claim (`jwt.go:529-546`).
- `NewWorkDomainUserStore` — selected whenever the DB is unreachable (`standard_auth.go:118-125`) — still falls back to `DemoPass123!` and seeds four users (`internal/auth/store.go:99-159`). **A DB outage silently downgrades to a known-credential in-memory admin with no production guard.**
- TOTP has no replay protection: `totp.Validate` with library-default ±1 window (`jwt.go:345`, `auth.go:607`).
- Permission checks exist (`jwt.go:608-612`, `hasPermissions:660`) but **every call site passes `nil`** — permission enforcement is dead code at baseline.

### 4.4 RBAC — `internal/auth/rbac.go`

```go
var roleRank = map[string]int{"viewer": 1, "analyst": 2, "operator": 3, "admin": 4}
```

- Product-title aliases map onto these four roles (`rbac.go:20-30`).
- `NormalizeRole` fails closed to `viewer` (`rbac.go:32-41`). **Correct.**
- `RequireRole` reads `c.GetString("role")`; empty role ⇒ deny (`rbac.go:47-63`). **Correct.**
- Applied to only **12 routes** (workspace admin, platform admin, api-keys, webhooks, cloud writes, SSO writes).
- `analyst` and `viewer` are behaviourally identical in routing. Effective hierarchy is binary: *some role* vs `admin`.

---

## 5. Multi-tenancy (verified)

### 5.1 Schema — `internal/database/database.go:87-214`

Tables with `tenant_id`: `users`, `cbom_reports`, `security_events`, `kubernetes_clusters`, `sso_configs`, `cloud_accounts`, `audit_events` (nullable FK).

Tables **without** `tenant_id`:

```go
// internal/database/database.go:130-142
CREATE TABLE IF NOT EXISTS crypto_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cbom_report_id UUID NOT NULL REFERENCES cbom_reports(id) ON DELETE CASCADE,
    algorithm TEXT NOT NULL, ...
```

```go
// internal/database/database.go:168-178
CREATE TABLE IF NOT EXISTS quantum_attestations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cbom_report_id UUID NOT NULL REFERENCES cbom_reports(id) ON DELETE CASCADE,
```

Tenancy for these two is reachable **only** by joining `cbom_reports`. Every query touching them directly is therefore structurally incapable of being tenant-scoped. This is the root cause of the IDOR findings below — the schema omission and the app-layer omission are the same defect.

Also verified: no Postgres row-level security anywhere; `users.email` is globally `UNIQUE`, so one person cannot exist in two tenants.

### 5.2 Repository layer — `internal/database/queries.go`

Tenant predicate present: `ListCBOMReports:133`, `ListSecurityEvents:341`, `ListKubernetesClusters:392`, `GetMetricsOverview:426-460` (via join).

Tenant predicate **absent**: `GetCBOMReport:110`, `UpdateCBOMReport:160`, `DeleteCBOMReport:174`, `GetCryptoAsset:201`, `UpdateCryptoAsset:253`, `ListCryptoAssets:221` (filters by report, not tenant), all `quantum_attestations` queries.

### 5.3 Handler layer

Verified tenant-scoped: `cbom` list/create (`handlers.go:188,198` — post-fetch compare), `security` list/create, `dashboard`, `kubernetes`, `monitoring`, `cilium`, scan jobs (in-memory `GetScanForTenant`, `internal/discovery/scan_manager.go:168-177`).

Verified **not** tenant-scoped:

| Handler | Location |
|---|---|
| `GET /assets` | `handlers.go:309` |
| `GET /assets/:id` | `handlers.go:326` |
| `PUT /assets/:id` | `handlers.go:359` |
| `GET /assets/:id/bom` | `handlers.go:908` (also binds the path param as `cbom_report_id`) |
| `PUT /security/events/:id/resolve` | `handlers.go:428` |
| Enterprise `GET/PUT/DELETE /inventory/assets/:id` | `internal/api/enterprise/inventory.go:252,327,349` |
| Enterprise `GET /enterprise/quantum/attest/:assetId` | `internal/api/enterprise/handlers.go:1034-1040` (joins `cr.tenant_id`, never filters it) |
| `POST /ai/analyze` | `internal/api/enterprise/ai_analysis.go:65` — **hardcodes the public tenant** |

Mass assignment: `internal/api/enterprise/inventory.go:273-296` binds `tenant_id` from the request body (`Asset.TenantID` is `json:"tenant_id"`, `inventory.go:67`).

### 5.4 Tenant header handling

`internal/tenant/context.go:42-47` reads `c.GetString("tenant_id")` only. `X-Tenant-ID` is never consulted, and `TestTenantIDForIgnoresSpoofedHeader` (`internal/api/enterprise/tenancy_test.go:11`) locks this in. **Header spoofing is correctly prevented** — but the anonymous path maps to `PublicTenantID` (`context.go:13`), which is what makes the unauthenticated data plane exploitable rather than merely reachable.

---

## 6. The critical structural defect

**`router.Use(authService.OptionalJWTAuthMiddleware())` at `internal/api/shared/standard_auth.go:128`, implemented at `internal/auth/jwt.go:629-657`:**

```go
func (as *AuthService) OptionalJWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if strings.TrimSpace(authHeader) == "" {
			c.Next()      // ← anonymous request continues into the handler
			return
		}
		...
	}
}
```

This is installed on the `/api/v1` group *before* every data-plane route. No other group in either edition attaches `JWTAuthMiddleware`. An inventory of the route table from the two `SetupRoutes` functions plus `SetupGitHubScanningRoutes`, `SetupIntelligenceRoutes`, `SetupDashboardDemoRoutes` and the Enterprise handler groups gives **~21 authenticated routes against ~180 unauthenticated ones**.

Unauthenticated reachable surfaces include: full CBOM CRUD, asset read/update, scan triggering, security-event resolution, Kubernetes cluster registration, Enterprise inventory CRUD, cloud-account CRUD, SSO configuration, quantum attestation reads, AI analysis, and the Enterprise audit log is authenticated but ungated by role.

This single decision dominates the security posture and is the reason Production readiness sat at 40.

---

## 7. Scanner (verified)

### 7.1 There is no single detector. There are three, and they disagree.

| Engine | Location | Input | Method | Output type |
|---|---|---|---|---|
| Live endpoint probe | `internal/discovery/{tls,ssh,http}_scanner.go` | live TLS/SSH/HTTP | runtime negotiation introspection | `discovery.Finding` |
| SBOM ingest | `internal/discovery/sbom_scanner.go` | CycloneDX/SPDX JSON | library-name → primitive table | `discovery.Finding` |
| **Source/repo content** | `internal/api/shared/github_content_scan.go` (687 LOC) | file text from GitHub API or embedded fixture | **regex + substring only** | `GHFinding` |

**Source detection has no AST layer.** Verified: no `go/parser`, `go/ast`, `go/token`, `tree-sitter`, or `golang.org/x/tools` anywhere in the repository or in `go.mod`. Only 16 `regexp.MustCompile` call sites exist under `internal/`, all in `internal/discovery/http_scanner.go` and `internal/api/shared/github_content_scan.go`.

The rule table is `cryptoRule` at `github_content_scan.go:184-193`:

```go
type cryptoRule struct {
	re          *regexp.Regexp
	algorithm   string
	findingType string
	severity    string
	quantumSafe bool
	owasp       string
	cwe         string
	remediation string
}
```

Rules carry **no rule ID**. Rules carry severity but **no confidence**. Parsed types: `.go`, `.py`, `.js`/`.ts`/`.json`, `.tf`, `Dockerfile`, `openapi.yaml`, secret-shaped files.

Implications for accuracy (both verified from the code structure):
- A comment or string literal containing `md5.Sum` produces a finding.
- An aliased call (`h := md5.New; h.Write(...)`) produces nothing.
- Substring rules such as `ec|ecdsa|ECDSA` and `rc4` fire on unrelated identifiers.

### 7.2 No measurement existed

Baseline had **zero** precision/recall figures. No labelled corpus, no per-rule metrics, no FP/FN accounting. `datasets/*/expected.json` files contain `must_match`/`must_not_match` substring assertions (5 datasets), and `fixtures/` holds 7 hand-written vulnerable files. That is a smoke test, not a benchmark. **This is why Scanner accuracy is honestly 58/100: it is unmeasured.**

### 7.3 Determinism

Finding *content* is deterministic in the intelligence layer: `intelligence.Fingerprint` is SHA-256 over stable fields with an explicit version tag, `ScannerVersion = "rivicq-intelligence/1.0.0"` (`internal/intelligence/fingerprint.go:11-34`), asserted by `TestFingerprintIsDeterministic` (`fingerprint_test.go:9`).

Output **ordering is not deterministic**:
- `internal/discovery/scanner.go:25-65` — goroutine fan-out with mutex-guarded append; lock order sets slice order.
- `internal/api/shared/github_content_scan.go:633-636` — `for k := range langs` into the API `Languages` field.
- `github_content_scan.go:168-179` — diff `New`/`Resolved`/`Unchanged` built by ranging maps. Every `/github/scans/:id/compare` response is randomly ordered for identical inputs.
- `time.Now().UTC()` in `ScannedAt` (`github_content_scan.go:648`) and `GeneratedAt` (`internal/benchmarks/datasets.go:178,243,314,479`).
- `internal/benchmarks/datasets.go:93-113` uses unseeded `math/rand` plus `uuid.New()`. Not reproducible run to run.

### 7.4 Three incompatible Finding types

| Type | Location | Fingerprint? | Key fields |
|---|---|---|---|
| `discovery.Finding` | `internal/discovery/types.go:30-40` | **No** | ID, TargetID, Component, Algorithm, KeyLength, Location, Severity, Description, Remediation |
| `GHFinding` | `internal/api/shared/github_scanning.go:55-73` | **No** (ID is a fresh UUID per finding) | adds OWASP, CWE, Evidence, Tool, CVE, Compliance, Demo |
| `intelligence.Finding` | `internal/intelligence/finding.go:12-35` | **Yes** | adds Fingerprint, Source, Scanner, Confidence, Status, PQCClass, Labels |

Fingerprints are stamped **at report-build time**, not at emission (`internal/intelligence/pipeline.go:20`). Consequence: raw API responses expose unstable UUIDs, and `compareGHScans` falls back to a `findingKey` heuristic because it cannot compare fingerprints.

### 7.5 SSRF and local file read (verified)

`POST /scans` (`internal/api/shared/handlers.go:756-774`) passes `req.Target` to `discovery.StartScanForTenant`.

`internal/discovery/scan_manager.go:407-423`:
```go
if strings.HasPrefix(raw, "./") || strings.HasPrefix(raw, "../") || raw == "." || raw == ".." ||
	strings.HasPrefix(raw, "/") || strings.HasPrefix(raw, "~") {
	if strings.HasPrefix(raw, "~") { home, _ := os.UserHomeDir(); raw = filepath.Join(home, strings.TrimPrefix(raw, "~")) }
	abs, err := filepath.Abs(raw)
	if isDir(raw) || isFile(raw) { return "local", 0, raw }
}
```
then `scan_manager.go:271-283` walks it as a local repo. `{"target":"/etc"}`, `{"target":"~/.aws"}`, `{"target":"/proc/self/environ"}` cause the server to read those paths.

`scan_manager.go:263-360` emits TLS (`:319-326`), SSH/22 (`:327-336`) and HTTP(S) (`:337-360`) probes for any host, executed by `tls_scanner.go:42`, `ssh_scanner.go:50-51,115`, `http_scanner.go`. **No private/loopback/link-local/metadata blocklist, no resolved-IP re-check.** `169.254.169.254`, `127.0.0.1:*` and RFC1918 are all reachable.

### 7.6 Unsigned GitHub webhook (verified)

`internal/api/shared/github_scanning.go:312-353` reads `X-GitHub-Event`/`X-GitHub-Delivery` and `c.GetRawData()` with **no `X-Hub-Signature-256` verification**, then on `push`/`pull_request` launches a background scan authenticated with the server's own `GITHUB_TOKEN` (`:336`). The route is unauthenticated (`github_scanning.go:506`).

---

## 8. CBOM and PQC taxonomy (verified)

### 8.1 CBOM

- Dedup **exists and is correct**: `internal/intelligence/cyclonedx.go:12-50` dedups components on `Algorithm|Library|Location`; covered by `TestCycloneDXCryptoBOM` (`pipeline_test.go:104`).
- **Not byte-deterministic**: `time.Now()` metadata plus the fixed serial `urn:uuid:rivicq-cbom` (`cyclonedx.go`). Two runs over identical input differ.
- **Not schema-validated**: structure asserted in tests only; no CycloneDX XSD check, no SPDX cross-check, no provenance flag separating detected from inferred.
- `internal/bom/unified.go:26-35` `Asset{ID, Name, Type, Provider, Location, Algorithms}` is thin — it lacks key size, certificate, repository, application, environment, owner, evidence, source, timestamp and scanner version.
- Persistence: `cbom_reports.bom_json` + one `crypto_assets` row per component (`internal/database/database.go:119-142`; writer at `internal/api/shared/handlers.go:30`). `crypto_assets` rows store neither `pqc_class` nor a taxonomy version.

### 8.2 PQC taxonomy — a genuine strength, with one gap

Classification is **fully deterministic and carries zero LLM involvement.** Verified: repo-wide grep for `openai|anthropic|openrouter|ollama|llm|gpt|claude|gemini|bedrock` across all Go sources returns **zero matches**, and `go.mod` contains no AI dependency. `internal/api/enterprise/ai_analysis.go` is misleadingly named — it is deterministic string assembly over DB values.

Three independent classification vocabularies coexist:
- NIST status/category (`internal/quantum/nistpqc/validate.go:21-36`): `Standardized|Candidate|Deprecated|Withdrawn|Hybrid` × `KEM|Signature|Symmetric|Hash`.
- Quantum risk level (`internal/quantum/pqc_service.go:27-46`): `CRITICAL|HIGH|MEDIUM|LOW|SAFE`.
- Intelligence class (`internal/intelligence/pqc_class.go:11-17`): `pqc_ready|pqc_hybrid_ready|pqc_migration_required|pqc_high_risk|pqc_unknown`.

`ClassifyPQC` (`pqc_class.go:26`) and `Classify` (`nistpqc/validate.go`) fail closed on unknown (`TestQuantumSafe_FailClosed`, `validate_test.go:89`). Explanations are present and structural: `RiskBreakdown` (`internal/intelligence/risk.go`) and per-rule `remediation`/`owasp`/`cwe`.

**Gap:** there is **no taxonomy version in any output.** `nistpqc.Provider.Info.Version = "1.0.0"` and `intelligence.ScannerVersion` are provider/engine versions. A CBOM consumer cannot tell which taxonomy revision produced a `pqc_ready`. Requested classes `PQC_READY / HYBRID_READY / MIGRATION_REQUIRED / LEGACY / HIGH_RISK / UNKNOWN` are not all present as a single versioned set — `LEGACY` is missing entirely.

---

## 9. Production readiness (verified) — the weakest area

| Capability | Baseline state | Evidence |
|---|---|---|
| Health check | Present; leaks DB state + `demo_mode` | `server.go:104-123` |
| Readiness check | Present; returns `200` even when `degraded` | `server.go:125-139` |
| Liveness | **Absent** (separate from health) | — |
| Graceful shutdown | `time.Sleep(2s)` + `os.Exit(0)` — **drops in-flight requests** | `server.go:90-95` |
| Structured logging | logrus with fields, but no formatter config, no redaction | `audit.go:34-43` |
| Request IDs | Present, **trusts client `X-Request-ID` verbatim** | `requestid.go:8-17` |
| Error handling | Inconsistent; several handlers echo `err.Error()` (can surface SQL/driver detail) | `auth.go:232-236`, `platform/handlers.go:236,369` |
| Rate limiting | Process-local, fixed 1-min window, keyed on `c.ClientIP()`, **`SetTrustedProxies` never called anywhere** → `X-Forwarded-For` fully bypasses it | `ratelimit.go:70-87`; verified no `SetTrustedProxies` in repo |
| CORS | Reflects **any** `Origin` with `Allow-Credentials: true`; default list contains `"*"` | `cors.go:22,56-79` |
| Security headers | Good: HSTS, CSP, `X-Frame-Options: DENY`, nosniff, Referrer-Policy, Permissions-Policy | `security.go:9-32` |
| Migrations | **Inline Go `CREATE TABLE IF NOT EXISTS` strings.** Not versioned, not reversible, no down-migration, no schema table | `database.go:66-264` |
| Secrets | DB password defaults to `cryptobom`, `sslmode` defaults to `disable`, **no production guard** (unlike JWT) | `database.go:29-33` |
| Fail-open demo | DB unreachable ⇒ `database.New` returns `nil` ⇒ fabricated responses, `demo_mode: true`, still `status: healthy` | `database.go:41-51`, `server.go:116` |
| Demo-mode defaults | `DEMO_MODE` unset ⇒ **enabled** in GitHub scanning (fail-open) vs fail-closed in auth | `github_scanning.go:362-365` vs `auth.go:658-661` |
| Config layer | `LoadOSS`/`LoadEnterprise` declare ~30 `yaml`-tagged fields and **never read a file**. Only 2-3 env vars honoured. Two sources of truth, one inert. | `internal/config/oss.go:168-329` |
| Timeouts | **No HTTP server read/write/idle timeouts anywhere.** `s.Engine.Run(addr)` | `server.go:98` |
| Resource limits | MaxOpen/Idle 25, conn lifetime 5m. No statement timeout. | `database.go:53-55` |
| Dependency pinning | `go.mod` + `go.sum` committed. **No SBOM generation for RivicQ itself.** | — |
| Docker | Not audited at baseline (see §12) | — |
| Backup / recovery | **No documentation, no procedure, no verification** | — |
| Rollback | **No procedure** | — |
| Deployment validation | **No pipeline gate** | — |

Database connection is configured in `internal/database` from env vars, **independent of** `config.OSSConfig.Database`. Editing the config file changes nothing.

---

## 10. CI/CD, Docker, observability, audit

- **CI:** `.github/` exists. `Makefile` (7.1 KB) and `build.sh` (10.9 KB) present. `validate.sh` (5.2 KB). Not audited for stage completeness at baseline.
- **Observability:** `internal/observability` is 1 file / 54 LOC. `internal/middleware/tracing.go` exists but **is never wired into the canonical server** (`middleware.go:23` admits this). There is no Prometheus metrics endpoint exposing scan duration, scan failures, API latency or DB latency.
- **Audit logging:** `internal/middleware/audit.go` records every request with method, path, status, latency, IP, UA, actor, tenant. Verified defects: it concatenates the **raw query string** into the recorded path (`:15-19`) and persists it (`:62`) — OAuth `code`/`state` are query parameters, so authorization codes are durably stored in `audit_events.path`. It also logs GETs and 4xx at `Warn`, which will flood.
- Requested event vocabulary (`LOGIN`, `USER_CREATED`, `ROLE_CHANGED`, `SCAN_STARTED`, …) is **not implemented**; only `request`/`client_error`/`server_error` exist.
- `audit.go:73,78` build placeholders with `string(rune('0'+argIdx))`, which yields `$:` at index 10 — a 500, not an injection.

---

## 11. Tests (verified inventory)

40 Go test files. Coverage by area:

| Area | Test files | Notable |
|---|---:|---|
| `internal/api` | 5 | `tenancy_test.go`, `auth_account_test.go`, `github_scanning_test.go`, `intelligence_test.go`, `standard_auth_runtime_test.go` |
| `internal/auth` | 5 | reset/change password, domains, RBAC, stores, demo identity |
| `internal/discovery` | 6 | TLS/SSH/HTTP rule tables, `BuildTargets` matrix, race test |
| `internal/intelligence` | 5 | fingerprint determinism, dedup, policy gates, CycloneDX |
| `internal/quantum` | 5 | NIST classification, plugin signing, registry concurrency |
| `internal/bom`/`compliance`/`controls`/`edition`/`hardware`/`middleware`/`platform`/`tenant` | 11 | incl. `platform_test.go` PII-stripping and webhook idempotency |
| `tests/` | 5 | HTTP suites, 2 cross-tenant isolation tests, 2 benchmarks |
| Frontend | 11 | roles, design system, ops findings, navigation, bom framework |

**Verified good:** the "honesty" discipline is consistent and real — `hardware.Honesty`, `TestCatalogHonesty`, `TestIBMSnapshotDoesNotInventAPIs`, `IsPlaceholderSecret`, and `must_not_match` placeholder-key entries all exist to stop overclaiming. The `datasets/known-good/self-scan` gate asserts RivicQ produces no blocking findings on its own source.

**Verified gaps:** no scanner accuracy benchmark; no per-rule fixture corpus; no negative/edge-case matrix; no cross-tenant write/delete/update tests; no IDOR tests; no rate-limit bypass test; no SSRF/path-traversal test; no SQL-injection test; no OAuth replay test; no webhook-signature test; no deterministic-ordering test; no DB integration test against a real Postgres; no E2E for the critical user journey.

---

## 12. Vibe-code debt (verified inventory)

| Item | Location | Disposition at baseline |
|---|---|---|
| `DemoPass123!` default bootstrap | `standard_auth.go:19,69`; `store.go:16,110-113` | Guarded in prod for the DB path; **unguarded for the no-DB path** |
| `oss-default-secret-not-for-production` | `standard_auth.go:18` | Guarded in prod |
| DB password `cryptobom`, `sslmode=disable` | `database.go:29-33` | Warn only, unguarded |
| `enterprise`/`oss` 57 MB and 16 MB binaries at repo root | `enterprise`, `oss` | Untracked build artifacts |
| `kubectl` 57 MB binary at repo root | `kubectl` | Untracked tool |
| `rsaande`, `rsande` (+ `.pub`) private keys at repo root, mode `0600` | `rsaande`, `rsande` | **Untracked test key material sitting in the working tree** |
| `**Reliability`, `**Transform`, `Tenant`, `Why` | repo root | 0-byte stray files from an unquoted shell glob |
| `temp_bench.json`, `temp_bench.txt` | repo root | Stray benchmark output |
| `.env` with live-looking values, mode `-rw-r--r--` | `.env` | **Not gitignored; world-readable; must be assumed compromised and rotated** |
| `cryptobom-server` 0-byte file | repo root | Stray |
| `getBenchmarksSummaryOSS` returns hardcoded scores | `internal/api/oss/handlers.go:385-396` | Fabricated metrics presented as measurements |
| `getCSPMOverviewOSS` returns hardcoded health score 74 | `internal/api/oss/handlers.go:399-439` | Fabricated |
| `getDemoScanResults` fabricates 8 findings against `localhost` ports | `internal/api/oss/handlers.go:298-354` | Demo, but reachable unauthenticated |
| `performMLSecurityScanOSS` returns hardcoded `{threats_detected: 2, quantum_risks: 1}` | `internal/api/oss/handlers.go:164-174` | Fabricated ML result |
| `getThreatIntelligenceOSS` returns a hardcoded threat with `confidence: 0.85` | `internal/api/oss/handlers.go:149-162` | Fabricated confidence |
| `ecosystemTools` advertises 8 SDKs/plugins across 6 languages | `internal/api/oss/handlers.go:190-231` | **Only `cryptobom-saas` is verified to exist in this repo.** The rest are unverified external claims in a security product's API response |
| `benchmarks.SaveDataset` always returns an error | `internal/benchmarks/datasets.go:446-453` | Dead code path |
| Unseeded `math/rand` in dataset generator | `internal/benchmarks/datasets.go:93-113` | Non-reproducible |
| Hardcoded confidence literals for optional tools | `internal/intelligence/adapters_external.go` | syft 0.7, trivy/grype 0.85, gitleaks/osv 0.8 — never calibrated, but presented as confidence |
| `ai_analysis.go` name implies AI; content is deterministic | `internal/api/enterprise/ai_analysis.go` | Misleading, not dangerous |
| `oauthStateMap` / `googleOAuthConfig` unsynchronized package globals | `google_oauth.go:32-35,96,177`; `github_oauth.go:32-33` | **Remote unauthenticated process-killing DoS via concurrent map write** |
| OAuth access + refresh tokens in redirect **query string** | `google_oauth.go:150-158`; `github_oauth.go:197-198` | Lands in browser history, `Referer`, every proxy log, and `audit_events.path` |
| `/openapi.json` hand-maintained, advertises 5 paths, never mentions auth | `internal/server/server.go:182-259` | **Documentation that misrepresents the API surface** |
| `LoadOSS`/`LoadEnterprise` YAML tags never read | `internal/config/oss.go:168-329` | Inert config surface |

---

## 13. Production blockers (must be fixed before any pilot)

**B-1 — Unauthenticated data plane.** `standard_auth.go:128`. Everything else is secondary.

**B-2 — Three divergent server bootstraps.** `cmd/server/main.go` runs the full middleware chain; `cmd/server/oss/main.go:20-48` and `cmd/server/enterprise/main.go:24-62` use `gin.Default()` and **bypass `middleware.Setup` entirely** — no audit persistence, different CORS, different rate limit. Which binary an operator deploys determines their security posture. Must be collapsed to one.

**B-3 — Fail-open to demo mode on DB loss.** `database.go:41-51` + `server.go:116`. A security product that reports `healthy` while serving fabricated findings is worse than one that is down.

**B-4 — No HTTP timeouts.** `server.go:98`. One slow client exhausts the process.

**B-5 — Cross-tenant IDOR with read *and* write *and* delete.** §5.3.

**B-6 — Committed-or-present secrets.** `.env` world-readable and not gitignored; four private keys in the working tree.

**B-7 — Fabricated security metrics served as measurements.** §12. Directly contradicts §31's "do not inflate the score" principle inside the product itself.

---

## 14. What "done" will mean for this cycle

Per §30, no item is complete without implementation + tests + security validation + error handling + observability + documentation + CI validation. Every fix in the hardening report must name the test that proves it and the command that runs it. Score changes are only claimed where a reproducible measurement exists.