# CryptoBOM SaaS – Audit Summary (2026-10-10)

## Repo
- Module: github.com/rivic-q/cryptobom-saas
- Root: /Users/re1/re1/CSPM
- Git: yes
- Platform: darwin

## Binaries (cmd/)
- cmd/rivicq/main.go – CLI (scan|sbom|cbom|vuln|secrets|iac|compliance|policy), --format, --fail-on, --json, --include-fixtures, exit codes 0/1/2
- cmd/server/main.go, cmd/server/oss/main.go, cmd/server/enterprise/main.go – server bootstraps
- cmd/scanner/main.go – posts to ${SCANNER_API_BASE:-http://localhost:5000/api/v1}/scans
- cmd/demo-scanner/main.go – writes cbom-findings.json
- cmd/tools/create_demo_users/main.go – uses DATABASE_URL, authn.SeedBootstrap

## Middleware (internal/middleware)
- Setup: SetTrustedProxies (TRUSTED_PROXIES), RequestID, SecurityHeaders, Audit, RateLimit, CORS, X-CryptoBOM-Edition
- TracingMiddleware per service (not in Setup)
- RateLimit: in-memory per-IP 1m, limit<0 disables, 429 + Retry-After:60, cleanup 10m
- CORS: https://rivicq.github.io + CORS_ORIGINS, headers incl Authorization,X-Request-ID,Idempotency-Key; exposed X-Request-ID,X-CryptoBOM-Edition,Retry-After; AllowCredentials true
- Audit: logs request_id/method/path/status/latency/ip/ua/body_bytes; redacts sensitive query params; writes to db.Queries.InsertAuditEvent when present; eventType request|client_error|server_error; reads tenant_id/user_id from gin context. No internal/audit package.

## Auth/AuthN
- auth.APIPrefix="/api/v1", deny-by-default via PublicRoutes + IsPublicRouteUnder; allow-list includes /auth/*, platform/billing/leads, /github/webhook, /billing/webhooks
- authn.EnforceAuth sets user_id,tenant_id,email,role,edition,permissions; public passthrough; 401 authentication_required + request_id
- authn.AuthenticateMiddleware accepts ?access_token=
- RBAC: Viewer/Analyst/Operator/Admin + roleAliases + NormalizeRole + RoleAtLeast + RequireRole(min); route_permissions table coarse; unmapped GET/HEAD allowed, unmapped mutations denied

## Routes (prefix /api/v1)
### OSS (shared via shared.SetupStandardAuth, oss.SetupRoutes)
- /cbom: GET,POST; /cbom/:id GET,PUT,DELETE; /cbom/:id/scan POST; /cbom/:id/attest POST
- /assets: GET; /assets/:id GET,PUT; /assets/:id/bom GET
- /scans: GET, POST; /scans/findings GET; /scans/:id GET, /scans/:id/report GET, /scans/:id/qbom GET
- /security: /events GET,POST; /events/:id/resolve PUT; /threats GET; /ml-scan POST
- /dashboard: /overview, /metrics, /compliance GET
- /kubernetes: clusters GET,POST; clusters/:id/status GET, clusters/:id/scan POST
- /monitoring: /integrations GET, /prometheus POST, /grafana POST, /jaeger GET
- /cilium: /flows, /policies GET; /policies POST; /metrics GET
- /metrics/overview, /cspm/overview, /benchmarks GET
- /github: /scan POST, /repos GET, /scans GET, /scans/:id GET, /scans/:id/compare GET, /webhook POST (public allow-list includes POST /github/webhook)
- /demo/scan, /ecosystem/*, /core/* GET; /findings, /policies, /intelligence/*, /architecture, /hardware/catalog, /hsm/status, /quantum/status, /security/api, /security/ai, /bom/framework, /bom/pipeline, /bom/unified, /governance/* GET; /policies/evaluate, /intelligence/evaluate POST; /scans/:id/intelligence|qiskit|cyclonedx GET
- /inventory/* (demo), /cloud/resources/summary, /cloud/accounts, /compliance/dashboard (demo), /analytics/* (demo)

### Authn (/api/v1/auth/*)
- POST /login,/register,/refresh,/logout,/forgot-password,/reset-password,/change-password,/mfa/verify,/mfa/setup,/mfa/confirm,/mfa/disable,/verify-email; GET /me,/editions,/providers,/verify-email,/sessions,/demo; PATCH /me; DELETE /sessions/:id; OAuth: /google/*, /github/*; workspace users/role management under workspace

### Platform (/api/v1)
- GET /platform/status, /platform/plans, /platform/funnel, /platform/contacts, /ibm, /billing/status
- POST /leads (rate-limited 8/min, separate limiter), POST /billing/checkout, POST /billing/webhooks (public)
- Admin: GET /platform/leads, /platform/opportunities, POST /platform/integrations/discord/test

### Enterprise (under /api/v1)
- CBOM: shared handlers + POST /cbom/:id/attest (attestCBOMReport)
- Assets + quantum-verify
- Security + threats/ml-scan
- Dashboard + quantum metrics
- Cloud: GET /cloud/providers; admin-only POST /cloud/aws|gcp|azure (enterpriseAuth + RequireRole(admin))
- SSO: GET /sso/providers; admin-only POST /sso/saml|ldap
- Analytics: GET /reports, POST /insights, GET /forecasts
- Kubernetes: + POST /kubernetes/clusters/:id/quantum-scan
- Monitoring: + POST /splunk, POST /datadog
- /metrics/overview
- /cspm/overview (enterpriseAuth)
- /enterprise/ibm: GET /hpcs/status, /hpcs/keys, /cos/buckets, POST /hpcs/keys/:keyId/attest
- /enterprise/aws: GET /cloudhsm/status, /kms/keys, /cloudtrail/crypto-events
- /enterprise/quantum: GET /assessment, POST /scan, GET /attest/:assetId, GET /migration-roadmap, GET /bom/:assetId/export
- /enterprise/gcp: GET /kms/keys, /gke/workloads, /hsm/keyrings
- /benchmarks
- /scans same as OSS (+ shared handlers)
- GitHub + AI routes via SetupAIRoutes (router.GET/POST /ai/analyze, /ai/status)
- Inventory handler (/inventory/*: assets CRUD+filters, crypto, ai models register, hardware list, hardware/discover (declared inventory, not firmware RE), software list, software/sbom import, infrastructure, summary, export)
- Compliance (/compliance/*: frameworks, controls, dashboard, scan, remediate, reports, delve/kertos connect/status/sync, risks CRUD+mitigate)
- MultiCloud (/cloud/* extended: accounts CRUD+sync+resources, /aws|gcp|ibm|azure inventory/scan, resources/summary)
- CNCF (/cncf/*: tools CRUD+metrics+health, integrations prometheus/grafana/argocd/flux/istio/linkerd/cilium/k3s, dashboard)
- Terraform (/terraform/*: resources CRUD/scan, workspaces, findings/violations, modules scan, drift, plan-history)
- Quantum attestation (/quantum/*: attestations CRUD/verify/refresh, networks/providers/provider status, readiness/migration, PQC algorithms + migrate) — uses provider registry
- API keys (/api-keys/*: GET; POST/DELETE/PUT require admin, auth.RequireRole)
- Audit (/audit/events* + export, summary, get) — uses AuditViewer
- Webhooks (/webhooks/* + deliveries, test requires operator, delete requires admin, create/update operator)

## Connectors / Providers
- AWS: awscloud (client, cloudhsm, kms/cloudtrail helpers) — falls back to unconfigured/demo when creds missing
- Azure: azurecloud/client
- GCP: gcpcloud/client (uses ADC/keyfile/emulator)
- IBM Cloud: ibmcloud/hpcs (HPCS + COS) — not configured returns demo statuses in enterprise handlers
- Quantum: provider registry + builtin IBM Quantum (opt-in, reports unavailable without key); plugin loader exists
- External scanners: grype/gitleaks optional via exec.LookPath (createTemp, cleanup)

## File uploads / temp files
- intelligence/adapters_external.go: os.CreateTemp for gitleaks report; defer remove
- inventory.ImportSBOM: accepts path or JSON content; scans local directory via discovery.ScanDirectoryForSBOM (no direct multipart save/upload observed); no FormFile/MaxMultipartMemory usage found in API routes (only tests use os.WriteFile/MkdirAll). hardware.DiscoverHardware returns declared catalog only.
- No obvious large upload storage (no S3 upload code in API paths shown)

## CLI mentions in docs
- Many docs reference `rivicq scan .`, flags (--format json, --fail-on BLOCK), build `make build-rivicq`, exit codes, self-scan. LICENSE has contact emails (enterprise@rivicq.xyz, https://rivicq.xyz/enterprise) — no explicit CLI redistribution clause text in LICENSE grep shown beyond trademarks/contact; repo includes QUICKSTART_CBOM.md, CHANGELOG.md, README.md describing CLI.

## Notes for new route families (/api/v1/firmware/*, /api/v1/identity/*)
- Firmware: discovery already has firmware class (ClassFirmware), scan manager, inventory_scanner returns FIRMWARE_COMPONENT_DECLARED (not firmware RE). Frontend has firmware targets; enterprise inventory has firmware_version. No API routes under /firmware or /api/v1/firmware found.
- Identity: frontend has Identity nav; no API routes under /identity or /api/v1/identity found (grep returned mostly azidentity/go.sum). Possible need for IAM/roles/users endpoints (authn workspace exists but not /identity resource).

## Gaps
- No routes for /api/v1/firmware/* or /api/v1/identity/* registered
- PublicRoutes allow-list has no firmware/identity endpoints
- Permission matrix (route_permissions) has no firmware/identity resources; new resources will need mapping (mutations default-deny if unmapped)
- Audit middleware redacts sensitive query params but not obvious file upload body redaction (body_bytes logged raw; sensitive endpoints may log PII in body if present) — consider body redaction for specific paths
- Delivery cache (webhook replay) is in-process (TTL+FIFO) — multi-instance needs shared store (documented)
