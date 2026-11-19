# Pilot onboarding

This runbook gets a controlled pilot from zero to a verified static site and a working
Community scan path. It does not enable the planned Supabase auth exchange, RLS, Stripe,
Qiskit service, event bus, runtime sensors, or AI platform.

Read [PILOT_READINESS.md](PILOT_READINESS.md) first. The current pilot scope is static
cryptographic inventory plus a labeled static console.

> Current status: PARTIALLY IMPLEMENTED — controlled pilot ready for static cryptographic inventory; production Enterprise remains BLOCKED BY EXTERNAL CONFIGURATION. Next: validate the buyer, trigger, and authorized source tree with five security-leader interviews by 2026-11-24, then ship the workflow, console, scanner, evidence, security, accessibility, and release-readiness roadmap.

## Roles

| Role | Owns |
|---|---|
| Pilot owner (customer) | Targets, authorization, data handling, feedback |
| Technical contact (customer) | Network access, API deployment, console URL |
| Security contact (both) | Incident path and disclosure |
| RivicQ operator | Build, deploy, acceptance evidence, rollback |

## Prerequisites

- Go toolchain for the CLI, or a published `rivicq` binary.
- Node.js 18+ for the React and Graph builds.
- Git access to the agreed branch or release tag.
- A PostgreSQL database if the hosted API will run outside demo mode.
- A strong `JWT_SECRET` generated with `openssl rand -hex 48`.
- Written authorization for every scan target and every copied artifact.

## Step 1 — Agree the scope

Record the target list, the data classification, the allowed scan window, and the named
contacts. Prefer synthetic fixtures for the first pass. Do not copy production private keys,
customer secrets, or database dumps into a pilot workspace.

## Step 2 — Choose the pilot mode

**Mode A: CLI-only (lowest risk).** No hosted API. Scan authorized local copies and attach
the JSON evidence to the pilot record. The Pages site stays a labeled static demo.

**Mode B: API + static console.** Deploy the API to the customer or a RivicQ-controlled host,
then build the console with `REACT_APP_API_URL` pointing at it. The static Pages site remains
a shell; it does not become a scan engine.

## Step 3 — Deploy the API (Mode B only)

Use `render.yaml`, the Docker image, or the customer's platform. Minimum environment:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL; production refuses to start without it |
| `JWT_SECRET` | Yes | At least 32 bytes; never commit it |
| `CORS_ORIGINS` | Yes | Exact console origin(s), comma-separated |
| `CRYPTOBOM_ENV` | Recommended | `production` disables localhost CORS and demo data |
| `REACT_APP_API_URL` | Build time | Console build only; not a server secret |
| `REACT_APP_SUPABASE_URL` | Optional | Public URL only |
| `REACT_APP_SUPABASE_PUBLISHABLE_KEY` | Optional | Publishable/anon key only; never `service_role` |

`RIVICQ_ALLOW_DEMO_MODE=1` is for labeled demos only and must not sit behind a customer load
balancer. Run migrations before the first request. Confirm `/healthz` and `/readyz` respond.

## Step 4 — Publish the static site

```bash
bash scripts/build-pages.sh
bash scripts/verify-pages-build.sh
```

The build produces `web/build` with:

- `/` React console shell and SPA fallback
- `/pilot/` pilot gate and onboarding links
- `/docs/` documentation hub, pilot docs, and capability manifest
- `/api/` ReDoc from `docs/openapi.yaml`
- `/fabric/` labeled RivicQ Graph
- `/marketing/` static marketing page
- `/archify/` architecture, workflow, and sequence maps
- `/media/` brand assets
- `_headers` and `_redirects` for Cloudflare Pages

Publish with `.github/workflows/pages.yml` on `main` or by manual `workflow_dispatch`.
`scripts/deploy-gh-pages.sh` performs the same build and pushes `web/build` to `gh-pages`.
Verify `https://rivicq.github.io/RivicQ_CSPM_EaaS/pilot/` after deployment.

Pages rules:

- Only the publishable Supabase key may appear in browser code.
- Never place `service_role`, database URLs, JWT secrets, Stripe secrets, or customer data in
  the Pages build.
- The Pages demo must stay labeled. Do not present sample findings as a live estate.
- Re-run the verification gate after every documentation or build change.

## Step 5 — Run the smoke test

```bash
make build-rivicq
./bin/rivicq scan fixtures/crypto-test --include-fixtures --fail-on BLOCK --format json
```

Expected: BLOCK findings, evidence paths, and exit code `1`. Then verify the usage boundary:

```bash
./bin/rivicq scan . --fail-on BOGUS   # expected exit 2
```

For the API:

```bash
SERVICE_URL="https://your-api.example.com" bash scripts/post_deploy_smoke.sh
```

## Step 6 — Run acceptance

Execute the tests in [PILOT_ACCEPTANCE_CRITERIA.md](PILOT_ACCEPTANCE_CRITERIA.md) and store the
results with the pilot record. Record pass/fail, date, operator, build SHA, and any deviation.
Do not mark a test as passed based on a deployment alone; each test needs its own evidence.

## Step 7 — Handoff and feedback

Provide the pilot owner with:

- Console URL and documentation URL
- CLI version and scan command
- Evidence locations and retention period
- Known limitations and support contacts
- Rollback path and incident contact

Collect a short written outcome: targets covered, findings accepted or disputed, missing
capabilities, and whether the next phase (Supabase auth/RLS, billing, Qiskit, real-time)
should be scheduled.

## Data handling

- Prefer synthetic fixtures and redacted evidence.
- Keep customer artifacts inside the agreed environment.
- Do not upload customer telemetry to third-party model providers.
- Delete pilot artifacts on the agreed schedule and confirm deletion in writing.

## Troubleshooting

| Symptom | Check |
|---|---|
| API refuses to start | `DATABASE_URL`, `JWT_SECRET`, and production env flags |
| CORS blocks the console | `CORS_ORIGINS` exactly matches the browser origin |
| `/readyz` is not 200 | Database reachable, migrations applied, not in demo mode |
| Console still shows demo data | `REACT_APP_API_URL` was not set at build time |
| Pages shows old content | Re-run the build, verify, and redeploy `gh-pages` |
| Live scan fails on Pages | Expected: Pages has no engine; use the CLI or deployed API |

## Rollback

- **CLI:** no server state; discard the local binary and evidence files.
- **API:** roll back the deployment revision and restore the database snapshot.
- **Pages:** redeploy the previous `gh-pages` commit or revert the workflow run.
