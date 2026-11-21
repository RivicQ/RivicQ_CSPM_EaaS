# Pilot readiness

**Decision: controlled pilot ready for static cryptographic inventory in RivicQ CSPM.**

This gate covers the Community CLI, the policy gate, CBOM export, tenant-scoped API behavior,
and the static GitHub Pages console/docs. It does **not** claim a hosted multi-tenant SaaS,
real-time detection, AI analysis, or silicon attestation. The standalone EaaS build is a
**separate surface** with its own binary and API; it is outside this pilot gate and is not
production-ready. See [EAAS_PRODUCT_STATUS.md](EAAS_PRODUCT_STATUS.md) and
[EAAS_LIMITATIONS.md](EAAS_LIMITATIONS.md).

Live gate: **https://rivicq.github.io/RivicQ_CSPM_EaaS/pilot/**
Last reviewed: **2026-11-19** · Evidence: [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) ·
Machine-readable manifest: [CAPABILITIES.yaml](CAPABILITIES.yaml)

## Status by area

| Area | Status | Pilot use |
|---|---|---|
| `rivicq scan` CLI, CBOM + SBOM, CycloneDX export | **READY** | Run on authorized source trees or fixture copies |
| Policy gate and `--fail-on` exit codes | **READY** | CI gate; invalid flags exit `2` |
| RSA-2048 classification | **READY** | Classified, not treated as automatically broken |
| JWT tenant claim; `X-Tenant-ID` ignored | **READY** | Cross-tenant report access returns `404` |
| CORS allow-list; production DB refusal | **READY** | Hosted API must set `CORS_ORIGINS` and `DATABASE_URL` |
| Static GitHub Pages console, docs, maps, graph | **READY** | Labeled demo shell; no customer estate attached |
| Hosted API for live scans | **LIMITED** | Must be deployed separately; Pages has no engine |
| Qiskit posture scores | **LIMITED** | Local taxonomy only; not IBM Quantum jobs |
| AI analysis and threat “ML” output | **LIMITED** | Template/heuristic output; do not present as trained AI |
| Enterprise UUID tenant expand/contract | **PLANNED** | Existing TEXT tenant IDs only; do not mix UUID tenant data |
| Supabase token exchange, memberships, invites, RLS | **PLANNED** | Not part of this pilot |
| Stripe checkout, subscriptions, trial quotas | **PLANNED** | Trials are manual and non-billed |
| Event bus, continuous scans, runtime sensors | **PLANNED** | No real-time claims |
| Live multi-cloud/HSM connectors | **BLOCKED** | Requires customer credentials and a deployed connector |
| EaaS standalone sandbox API and portal (`cmd/eaas`, `:9091`) | **LIMITED / OUT OF SCOPE** | Separate local sandbox; do not fold into the CSPM pilot evidence |
| EaaS production Postgres repository | **BLOCKED** | Target schema only; no Go Postgres repository exists |

## EaaS is a separate surface

EaaS ships as its own binary (`cmd/eaas`, `internal/eaas`, `web/eaas`) with a default listen
address of `:9091`, `/api/eaas/v1/*` and `/api/beta/v1/*` routes, and a developer portal served by
that binary at `/` and `/portal`. GitHub Pages serves the CSPM docs and labeled demos, not the
EaaS portal. State is an atomic JSON sandbox file; `deploy/migrations/004_eaas_schema.sql` is a
target schema with no Go Postgres repository behind it. Numeric quotas and RPM are enforced, but
plan flags for SSO, HSM, audit log, and advanced analytics are display-only. Classical crypto is
implemented; ML-KEM-768 and ML-DSA-65 are `Experimental` via `cloudflare/circl`, and SLH-DSA is
not implemented. There is no Stripe/payment collection, payment webhooks, email delivery, hosted
deployment, CAVP/FIPS validation, HSM custody, AI operations, quantum hardware, or wireless
operations. EaaS CI is path-filtered gofmt/vet/build/test with no deploy gate. Details:
[EAAS_API.md](EAAS_API.md), [EAAS_DEPLOYMENT.md](EAAS_DEPLOYMENT.md),
[EAAS_TESTING_CI.md](EAAS_TESTING_CI.md).

## What a pilot may test

- Static inventory of an authorized source tree, fixture copy, or public website via the CLI or a
  separately deployed API.
- Policy decisions and evidence JSON.
- Tenant isolation and auth boundary behavior on the API.
- The static Pages console as a **labeled demo**, not as a live estate.
- Documentation, architecture maps, and the Graph demo.
- The EaaS local sandbox may be evaluated separately with explicit `sandbox` labeling; it is not
  part of the CSPM pilot evidence or a production trial.

## What a pilot must not claim

- That GitHub Pages runs scans or stores customer findings.
- That Qiskit scores are IBM Quantum hardware results.
- That control mappings are ISO, SOC, DORA, or BSI certifications.
- That firmware analysis extracts protected keys, flashes devices, or attests silicon.
- That template or heuristic output is a trained AI model.
- That real-time detection, continuous scanning, or runtime sensors are available.
- That EaaS is production-ready, Postgres-backed, hosted on Pages, or covered by this gate.
- That EaaS plan flags (SSO, HSM, audit log, advanced analytics) are enforced features.
- That EaaS PQC operations are validated or certified, or that SLH-DSA is available.

## Pilot entry checklist

- [ ] Named pilot owner, technical contact, and security contact on both sides.
- [ ] Written authorization for every target and every copied artifact.
- [ ] No production secrets in fixtures, screenshots, tickets, or Pages.
- [ ] API deployed with `DATABASE_URL`, a strong `JWT_SECRET`, and explicit `CORS_ORIGINS`.
- [ ] Console built with `REACT_APP_API_URL` pointing at that API, or explicitly left in demo mode.
- [ ] Static Pages build passes `scripts/verify-pages-build.sh`.
- [ ] Any EaaS evaluation is kept separate from the CSPM pilot record and labeled as sandbox use.
- [ ] [PILOT_ACCEPTANCE_CRITERIA.md](PILOT_ACCEPTANCE_CRITERIA.md) agreed before day one.
- [ ] Rollback and support escalation path agreed.

## Day-one smoke test

```bash
make build-rivicq

# Expected: exit 1 with BLOCK findings and evidence paths.
set +e
./bin/rivicq scan fixtures/crypto-test --include-fixtures --fail-on BLOCK --format json
block_rc=$?
set -e
test "$block_rc" -eq 1

# Expected: usage error, exit 2.
set +e
./bin/rivicq scan . --fail-on BOGUS
usage_rc=$?
set -e
test "$usage_rc" -eq 2

# Hosted API checks (only if an API was deployed for the pilot).
SERVICE_URL="${SERVICE_URL:-http://localhost:8080}"
curl -fsS "$SERVICE_URL/healthz"
curl -fsS "$SERVICE_URL/readyz"
bash scripts/post_deploy_smoke.sh --service-url "$SERVICE_URL"
```

## Pages build gate

```bash
bash scripts/build-pages.sh
bash scripts/verify-pages-build.sh
```

The verification gate checks the composite layout, pilot documents, capability manifest, SPA
fallback, Graph/docs/marketing/Archify output, host config, and the absence of committed secrets.

## Onboarding

Follow [PILOT_ONBOARDING.md](PILOT_ONBOARDING.md) for environment setup, Pages publication, and
the handoff sequence. The acceptance tests remain in
[PILOT_ACCEPTANCE_CRITERIA.md](PILOT_ACCEPTANCE_CRITERIA.md).

## Support

- Pilot delivery: `support@rivicq.com`
- Security issue: `security@rivicq.com`
- Commercial: `sales@rivicq.com`

Do not send customer secrets, private keys, or production database dumps by email or chat.
