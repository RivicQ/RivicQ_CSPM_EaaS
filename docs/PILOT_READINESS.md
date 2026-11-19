# Pilot readiness

**Decision: controlled pilot ready for static cryptographic inventory.**

This gate covers the Community CLI, the policy gate, CBOM export, tenant-scoped API behavior,
and the static GitHub Pages console/docs. It does **not** claim a hosted multi-tenant SaaS,
real-time detection, AI analysis, or silicon attestation.

Live gate: **https://rivicq.github.io/RivicQ_CSPM_EaaS/pilot/**
Last reviewed: **2026-11-19** · Evidence: [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) ·
Machine-readable manifest: [CAPABILITIES.yaml](CAPABILITIES.yaml)

> Current status: PARTIALLY IMPLEMENTED — controlled pilot ready for static cryptographic inventory; production Enterprise remains BLOCKED BY EXTERNAL CONFIGURATION. Next: validate the buyer, trigger, and authorized source tree with five security-leader interviews by 2026-11-24, then ship the workflow, console, scanner, evidence, security, accessibility, and release-readiness roadmap.

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

## What a pilot may test

- Static inventory of an authorized source tree, fixture copy, or public website via the CLI or a
  separately deployed API.
- Policy decisions and evidence JSON.
- Tenant isolation and auth boundary behavior on the API.
- The static Pages console as a **labeled demo**, not as a live estate.
- Documentation, architecture maps, and the Graph demo.

## What a pilot must not claim

- That GitHub Pages runs scans or stores customer findings.
- That Qiskit scores are IBM Quantum hardware results.
- That control mappings are ISO, SOC, DORA, or BSI certifications.
- That firmware analysis extracts protected keys, flashes devices, or attests silicon.
- That template or heuristic output is a trained AI model.
- That real-time detection, continuous scanning, or runtime sensors are available.

## Pilot entry checklist

- [ ] Named pilot owner, technical contact, and security contact on both sides.
- [ ] Written authorization for every target and every copied artifact.
- [ ] No production secrets in fixtures, screenshots, tickets, or Pages.
- [ ] API deployed with `DATABASE_URL`, a strong `JWT_SECRET`, and explicit `CORS_ORIGINS`.
- [ ] Console built with `REACT_APP_API_URL` pointing at that API, or explicitly left in demo mode.
- [ ] Static Pages build passes `scripts/verify-pages-build.sh`.
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
