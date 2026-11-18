# Beta Acceptance Checklist

Controlled private-beta checklist for realistic end-to-end verification. Use this as an execution guide, not a certification claim.

## Preconditions and notes

- Run commands from repo root: `/Users/re1/re1/CSPM` (or your checkout path).
- Environment-dependent checks (databases, auth providers, Stripe, OAuth/SSO IdPs, cloud credentials, cluster access) must be configured before execution; otherwise record them as **not run / environment-gated** with reason.
- Do not treat GitHub Pages as a live scan backend.
- Do not claim certifications, turnkey SSO handshakes, live connector estates, or deployment paths that are unsupported by current artifacts.
- Suggested local gate before manual E2E: `make verify-beta` (skips external/secret-gated checks by design).

## 1. OSS CLI scan, CBOM/SBOM, and policy gate

**Goal:** Confirm the community CLI can scan authorized inputs and enforce policy/format behavior.

**Commands**
```bash
go build -o bin/rivicq ./cmd/rivicq

# Expect blocking findings on synthetic crypto fixture (exit code 1)
set +e
./bin/rivicq scan fixtures/crypto-test --include-fixtures --fail-on BLOCK
block_rc=$?
set -e
echo "block_rc=$block_rc"
test "$block_rc" -eq 1

# Expect usage/validation error for invalid fail-on (exit code 2)
set +e
./bin/rivicq scan fixtures/crypto-test --include-fixtures --fail-on BOGUS
usage_rc=$?
set -e
echo "usage_rc=$usage_rc"
test "$usage_rc" -eq 2

# JSON output
./bin/rivicq scan fixtures/crypto-test --include-fixtures --format json > /tmp/rivicq-scan.json

# CycloneDX CBOM export when supported by local CLI build
./bin/rivicq scan fixtures/crypto-test --include-fixtures --format cyclonedx > /tmp/rivicq-cbom.json || true

# Self-scan/policy gate on repo (expected clean per configured exclusions/rules)
./bin/rivicq scan . --fail-on BLOCK
```

**Expected results**
- CLI builds successfully.
- Known-bad fixture scan with `--fail-on BLOCK` exits non-zero when blocking findings are present (expected `1` in this fixture case).
- Invalid `--fail-on` value is rejected as usage error (expected `2`), not silently treated as BLOCK.
- JSON scan output is produced and parseable.
- CBOM/SBOM-related export formats supported by the installed CLI produce structured output; unsupported format flags should fail clearly.
- Repo self-scan behavior matches current policy/detector expectations (no unexplained BLOCK regressions).

## 2. API scan, report, and export

**Goal:** Validate authenticated API scan lifecycle and tenant-scoped report/export access on a deployed/configured API.

**Preconditions**
- API running with required config (`DATABASE_URL` for non-demo production modes, strong `JWT_SECRET`, CORS/auth settings as needed).
- Valid user/session or bootstrap credentials available.
- `SERVICE_URL` set (example: `http://localhost:8080` or `http://localhost:9090`).

**Commands (example flow)**
```bash
SERVICE_URL="${SERVICE_URL:-http://localhost:8080}"
API="$SERVICE_URL/api/v1"

curl -fsS "$SERVICE_URL/healthz"
curl -fsS "$SERVICE_URL/readyz" || true

# Authenticate (adjust payload/endpoint to deployed auth config)
TOKEN=$(curl -fsS -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"<password>"}' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("token") or d.get("access_token",""))')

# Create scan
SCAN_JSON=$(curl -fsS -X POST "$API/scans" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"target":"https://example.com","scan_type":"website"}')
echo "$SCAN_JSON"
SCAN_ID=$(echo "$SCAN_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("scan_id") or json.load(sys.stdin).get("id",""))')

# Poll/status and retrieve report/export
curl -fsS "$API/scans/$SCAN_ID" -H "Authorization: Bearer $TOKEN"
curl -fsS "$API/scans/$SCAN_ID/report" -H "Authorization: Bearer $TOKEN" > /tmp/scan-report.json
curl -fsS "$API/scans/$SCAN_ID/cyclonedx" -H "Authorization: Bearer $TOKEN" > /tmp/scan-cyclonedx.json || true
curl -fsS "$API/intelligence/scans/$SCAN_ID" -H "Authorization: Bearer $TOKEN" > /tmp/scan-intelligence.json || true
```

**Expected results**
- Health/readiness endpoints respond as configured for the environment.
- Auth returns a usable token/session for protected routes.
- Scan creation returns a scan/job identifier; status/report endpoints return structured JSON for the owning tenant.
- Export/report endpoints return supported artifacts (report/intelligence/CycloneDX where implemented).
- Access with another tenant/user context to the same scan ID is denied or not found (tenant isolation preserved). `X-Tenant-ID` spoofing must not grant access.

## 3. Invite and verified registration

**Goal:** Confirm onboarding flows behave correctly when enabled/configured.

**Preconditions**
- Registration/invite/verification settings enabled in the deployed environment.
- Email delivery or a supported local verification mechanism available if verification is required.

**Commands / checks (environment-specific)**
```bash
# Example: register (endpoint/payload may vary by deployment)
curl -i -sS -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"new-user@example.com","password":"<strong-password>","name":"Beta User"}'

# Example: verify token/link flow when token is obtainable from configured dev/test channel
curl -i -sS -X POST "$API/auth/verify" \
  -H 'Content-Type: application/json' \
  -d '{"token":"<verification-token>"}'

# Example: invite/create-user admin flow if enabled
curl -i -sS -X POST "$API/admin/invites" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"email":"invitee@example.com","role":"analyst"}'
```

**Expected results**
- Registration/invite requests succeed only with valid input and policy-compliant passwords.
- Unverified accounts are restricted according to configuration; verified accounts can authenticate.
- Invalid/expired verification or invite tokens are rejected with clear errors.
- If email/invite infrastructure is not configured, mark this section **environment-gated** (not a product claim failure by itself).

## 4. Tenant, role, and entitlement

**Goal:** Verify protected resources are tenant-scoped and role/edition entitlements are enforced on covered routes.

**Checks / commands**
```bash
# Compare access with two users in different tenants (or tenant contexts)
curl -i -sS "$API/scans/$SCAN_ID/report" -H "Authorization: Bearer $TENANT_A_TOKEN"
curl -i -sS "$API/scans/$SCAN_ID/report" -H "Authorization: Bearer $TENANT_B_TOKEN"

# Role checks (examples; adjust to deployed routes)
curl -i -sS -X POST "$API/admin/keys" -H "Authorization: Bearer $VIEWER_TOKEN" -H 'Content-Type: application/json' -d '{}'
curl -i -sS -X POST "$API/admin/keys" -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"name":"beta-key"}'

# Edition/entitlement checks (enterprise-only endpoints should deny or present licensed behavior appropriately)
curl -i -sS "$API/bom/qbom" -H "Authorization: Bearer $TOKEN" || true
curl -i -sS "$SERVICE_URL/edition"
```

**Expected results**
- Tenant B cannot read Tenant A scan/report/export resources (404/denied per implementation).
- Role-restricted/admin operations are denied for insufficient roles on covered routes.
- Edition/entitlement responses are truthful (licensed feature available, feature locked/denied, or unconfigured) without fabricating data.
- Any route not covered by enforcement in the deployed build is recorded as a gap, not assumed secure.

## 5. OAuth, session, and RBAC

**Goal:** Validate authentication/session lifecycle and OAuth integration behavior where configured.

**Preconditions**
- OAuth provider credentials/callback URLs configured for target environment, if testing OAuth.
- Session/token settings configured (`JWT_SECRET`, refresh/session config as applicable).

**Checks / commands**
```bash
# Session/login and token use
curl -i -sS -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"<password>"}'

# Example authenticated request
curl -i -sS "$API/auth/me" -H "Authorization: Bearer $TOKEN" || true

# Example logout/refresh endpoints if implemented in deployment
curl -i -sS -X POST "$API/auth/refresh" -H 'Content-Type: application/json' -d '{"refresh_token":"<token>"}' || true
curl -i -sS -X POST "$API/auth/logout" -H "Authorization: Bearer $TOKEN" || true

# OAuth start/callback are typically browser flows; verify configured provider redirects and callback completion manually
```

**Expected results**
- Valid credentials establish a session/token; invalid credentials fail clearly.
- Protected endpoints require valid authentication context.
- Token/session refresh/logout behavior matches deployment configuration; expired/invalid tokens are rejected.
- OAuth sign-in completes only with correctly configured provider/callback settings; missing provider config yields explicit unconfigured/error behavior (no silent fallback claims).
- RBAC checks remain enforced after OAuth/session login for covered routes.

## 6. RevenueOS quote, checkout, and license provisioning

**Goal:** Validate commercial flow behavior in `revenueos` for private beta where integrations are configured.

**Preconditions**
- `revenueos` dependencies installed and environment configured (database, app secrets, Stripe/test keys, webhook secrets, provisioning targets as required).
- External payment/provider checks are **secret-gated** and may be skipped in local CI-like environments.

**Commands (local app checks)**
```bash
cd revenueos
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run build
```

**Manual/E2E checks (configured environment)**
- Create a quote (UI/API flow as implemented).
- Initiate checkout and complete with Stripe test mode.
- Receive/process webhook/callback events.
- Confirm license/provisioning record/state transition is created for the purchased/approved entitlement.
- Verify failure paths (canceled checkout, webhook signature failure, incomplete payment) do not provision licenses.

**Expected results**
- RevenueOS build/test/lint/typecheck pass.
- Quote creation persists expected draft/issued state.
- Checkout session creation and completion work only with valid provider configuration.
- License provisioning occurs only after confirmed successful payment/approval event and is auditable in application records/logs.
- Unconfigured external integrations are reported honestly (not marked successful).

## 7. Enterprise honest unconfigured states

**Goal:** Ensure enterprise surfaces do not fabricate capabilities or estates in private beta.

**Preconditions**
- Enterprise build/license/config available for the specific environment under test (if applicable).

**Checks**
- Start/use enterprise UI/API without cloud connector credentials.
- Inspect SSO settings/integration surfaces without completing IdP ACS handshake.
- Inspect compliance/evidence views and labels.
- Inspect Helm/deploy artifacts before claiming installability:
```bash
find deploy/helm/cryptobom-enterprise -maxdepth 3 -type f | sort
# Helm lint becomes meaningful only when chart templates exist
if [ -d deploy/helm/cryptobom-enterprise/templates ] && find deploy/helm/cryptobom-enterprise/templates -type f | grep -q .; then
  helm lint deploy/helm/cryptobom-enterprise
else
  echo "enterprise chart templates absent: do not claim enterprise Helm deploy readiness"
fi
```

**Expected results**
- Connectors/integrations show unconfigured/empty states when credentials or external systems are absent; no fabricated cloud assets/findings.
- SSO is treated as config/plumbing unless a full IdP handshake is validated in that environment.
- Compliance outputs are presented as mappings/evidence aids, not certifications.
- Deployment claims (Helm install/rollback/monitoring) are made only when required templates/manifests/charts and cluster access exist.

## 8. Static Pages demo boundaries

**Goal:** Confirm GitHub Pages/static site output is a safe demo/docs surface with no live backend assumptions.

**Commands**
```bash
bash scripts/build-pages.sh
# build-pages.sh runs scripts/verify-pages-build.sh; rerun explicitly if needed
bash scripts/verify-pages-build.sh
```

**Manual checks**
- Open local build output or deployed Pages site and verify demo labels/boundaries are present.
- Confirm pilot/docs pages and capability/status docs are reachable from the published navigation/paths.
- Confirm public site does not claim live scanning, live tenant data, or production API execution from static hosting.

**Expected results**
- Pages build and verification pass.
- Composite site includes required docs/pilot artifacts and SPA/static fallbacks.
- Static site remains a labeled demo/documentation surface; live scan/report flows require a separately deployed API/CLI environment.
- No secrets or environment files are present in generated Pages output.

## Evidence capture (recommended)

For each section record:
- Date/time, commit SHA, environment (local/staging/pilot), operator
- Commands run and exit codes
- Links/screenshots/artifacts (reports, exports, logs) with secrets redacted
- Result: pass / fail / environment-gated / not applicable
- Follow-up issues for any gaps
