# RivicQ Enterprise Platform — current state

Do not inflate. GitHub Pages is static. Community is a limited scan engine. Enterprise is a licensed control plane. Control mappings are not certifications.

This document is the Phase 0 audit plus the increment shipped on `cursor/rivicq-com-platform-86cc`. It is not a claim that CRM, Stripe, Discord, or IBM Partner APIs are production-live.

## CURRENT STATE REPORT

### 1. Architecture

Go Community API (`:8080`) and Enterprise API (`:9090`) share `internal/api/shared`. React console (`web/`) is the operator UI. GitHub Pages deploys `web/build/` plus `docs/` from `main`. Optional RivicQ Graph demo is a separate static graph app (`fabric/`, `/fabric`; formerly NEXUS). One process is the source of truth when the API runs; Pages must not hold secrets or private customer data.

### 2. Technology stack

Go 1.26, Gin, optional PostgreSQL (`lib/pq`), JWT auth, React 18 + MUI, Framer Motion. No Stripe SDK. No IBM Partner Plus SDK.

### 3. Database architecture

Relational Postgres when `DATABASE_URL` / `CRYPTOBOM_*` is set: tenants, users, CBOM reports, crypto assets, security events, clusters, audit events, plus `commercial_leads` and `users.organisation`. Without Postgres the API is in-memory demo mode. There is not yet a full 50-entity CRM schema — that would be empty tables pretending to be Salesforce.

### 4. API architecture

Versioned under `/api/v1`. Scan/auth/dashboard JSON contracts are stable (`discovery.ScanResult`, JWT login). New commercial routes:

- `GET /platform/status|plans|funnel|contacts`
- `POST /leads` (public, rate-limited)
- `GET /leads`, `GET /opportunities` (admin)
- `GET /ibm` (readiness snapshot, no IBM APIs)
- `GET /billing/status`, `POST /billing/checkout`, `POST /billing/webhooks`

### 5. Frontend architecture

Public nebula site: Home, Product, CSPM, CBOM, PQC, Enterprise, Security, Pricing, Request demo, Contact, IBM Partner Plus, Docs. RivicQ Graph is a separate labeled demo at `/fabric`. Authenticated shell: Operations / Posture / Integrations / Enterprise. Auth recovery pages use the same black/violet `NebulaBackdrop` as sign-in.

### 6. Authentication architecture

Password JWT, optional MFA, Google/GitHub OAuth when configured, demo token via `GET /auth/demo`. Register now persists `organisation` on the user and returns it from `GET /auth/me`. Edition switcher is a UI preference, not a license grant.

### 7. Deployment architecture

Pages workflow builds Community React and publishes to `gh-pages`. Production scans need CLI or a running API. Live scanning on Pages needs the RivicQ engine (`REACT_APP_API_URL` at build time). Without it the public site shows **Needs the RivicQ engine** and never fabricates findings.

### 8. Existing integrations

PATH scanners (Syft, Trivy, Grype, Gitleaks, OSV) when installed. Optional IBM Cloud / HPCS connectors with customer credentials. Discord webhook optional. Payment adapter is a stub. Calendar/Google Workspace OAuth exists for login, not as a CRM mailbox product.

### 9. Existing CSPM capabilities

Scan → findings → CBOM/QBOM intelligence → PQC taxonomy. Operator findings queue with evidence. Live cloud attach is Enterprise + credentials.

### 10. Existing CRM capabilities

Inbound leads only. Funnel stages are a model. Opportunity list is empty by design. No seeded Acme deals.

### 11. Existing payment capabilities

Configuration-driven list prices. Checkout returns `not_configured` unless a real PSP adapter is implemented. Webhooks require HMAC + event id; duplicates are ignored. Card data is never stored.

### 12. Existing automation

GitHub Actions: lint/test/build, Pages deploy, CodeQL (duplicate cancelled jobs are not a product failure). Lead → optional Discord notify (no email in the payload).

### 13. Security vulnerabilities / residual risk

- Default JWT secret if `JWT_SECRET` unset (dev only; warned).
- Pages cannot enforce RBAC; it is a public demo.
- Payment stub must not be mistaken for Stripe.
- IBM workspace must not be mistaken for Partner World.

### 14. UX/UI weaknesses

Command palette / findings UX is an operator MVP, not a full CISO suite. Empty console heroes must show labeled charts, not a solid violet wash.

### 15. Performance problems

No published latency SLO. CBOM generation is scan-bound. Do not claim performance numbers without a benchmark run against a named fixture.

### 16. Technical debt

`proBlue` / `gold` token names still hold violet. RivicQ Graph source still lives in `fabric/`. Enterprise inventory handlers still have demo fallbacks when DB is down.

### 17. Missing functionality (honest)

Email mailbox product, calendar CRM sync, Stripe checkout, IBM co-sell APIs, marketplace publish, customer 360 graph, task engine, PoC project module, founder overview with live MRR.

### 18. Production blockers

1. Merge nebula + this platform branch to `main` so github.io matches rivicq.com.
2. Postgres + `JWT_SECRET` + TLS for any real tenant.
3. Licensed Enterprise binary for connectors.
4. PSP adapter + webhook secret before any paid entitlement.
5. Official IBM Partner Plus API access before any IBM integration is marked live.

---

## TARGET vs THIS INCREMENT

Website → lead → CRM list is connected. Demo trail stays labeled sample data. IBM is a readiness checklist. Payments are an interface. Discord is a notifier.

---

## SCORES (do not inflate)

```
Architecture          62/100
Security              68/100
Product (CSPM/CBOM)   70/100
CRM                   28/100
Sales                 24/100
Operations            55/100
Payments              22/100
Integrations          48/100
IBM readiness         34/100
UX/UI                 72/100
Performance           40/100
Production readiness  46/100

OVERALL RIVICQ PLATFORM SCORE  47/100
```

Full engineering/UX register: [ENGINEERING_AUDIT.md](ENGINEERING_AUDIT.md) (overall **52/100**, classification **PILOT READY** for Community scan / **NOT ENTERPRISE READY**).

Weighted sense-check: product + security pull the score up; CRM, payments, and IBM APIs are stubs, so the commercial platform score stays below 50. Stage: **Commercial MVP with an honest front door** — not Enterprise Ready.

### Product

| Area | Score | Note |
|------|------|------|
| CSPM | 64 | Scan + posture UI; live cloud needs license + credentials |
| CBOM | 70 | CycloneDX path exists |
| PQC | 66 | Local taxonomy, not IBM Quantum hardware |
| Security | 68 | JWT tenancy, RBAC, no secrets on Pages |

### Commercial

| Area | Score | Note |
|------|------|------|
| CRM | 28 | Leads only |
| Sales funnel | 24 | Stages defined, zero invented opps |
| PoC | 18 | Intent capture only |
| Payment | 22 | Adapter + list prices |

### Operations

| Area | Score | Note |
|------|------|------|
| Ops console | 55 | Findings queue, persona, ⌘K |
| Automation | 40 | CI + optional Discord |
| Observability | 45 | Health exists; not a full SRE stack |

### IBM

| Area | Score | Note |
|------|------|------|
| Partner Plus selection | tracked | Status: selected, APIs not connected |
| Technology mapping | documented | IBM Cloud / HPCS opt-in; watsonx / IBM Security not integrated |
| Marketplace | blocked | Do not auto-publish |
| Co-sell | 0 records | None fabricated |

---

## Production checklist (this branch)

- [x] Website nebula identity in source
- [x] Public desks only on Contact
- [x] Lead capture with Pages mailto fallback
- [x] Pricing configuration (not live checkout)
- [x] IBM readiness workspace (no fake APIs)
- [x] Payment adapter stub + signed webhook hook
- [x] Discord sanitizer
- [x] Organisation persisted on register
- [ ] GitHub Pages shows nebula (needs merge to `main`)
- [ ] Stripe / other PSP live
- [ ] IBM Partner APIs
- [ ] Email / calendar CRM
- [ ] Backup/restore drill
- [ ] Performance benchmark completed
