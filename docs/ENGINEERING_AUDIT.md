# RivicQ complete engineering + UX audit

**Date:** 10 September 2026  
**Branch inspected:** `cursor/rivicq-com-platform-86cc` (plus repo tree on disk)  
**Method:** repository inspection, existing tests, and this increment. Not a paid pentest. Not a certification.

Do not treat this document as Enterprise Ready. Scores are not inflated.

---

## 1. Current architecture

```
Public GitHub Pages (static React + docs + RivicQ Graph)
        │  no production API
        ▼
Community API :8080  ──shared──  Enterprise API :9090
  discovery / intelligence / CBOM / JWT tenancy
        │
        ▼
Optional Postgres   PATH scanners   licensed connectors
```

Mapped from source, not from marketing copy:

| Layer | Path | Honest role |
|---|---|---|
| Community server | `cmd/server/oss` | Scan + dashboard API |
| Enterprise server | `cmd/server/enterprise` | Same engine + control-plane routes |
| CLI | `cmd/rivicq` | `rivicq scan .` |
| Intelligence | `internal/intelligence`, `internal/discovery` | Findings, gate, Qiskit taxonomy |
| Auth | `internal/auth`, `internal/api/shared` | JWT, MFA, OAuth when configured |
| Tenancy | `internal/tenant` | JWT `tenant_id`; spoofable headers ignored |
| Commercial | `internal/platform` | Leads, plans, IBM readiness, payment stub |
| Console | `web/` | Operator UI + public site |
| Graph demo | `fabric/` | Labeled synthetic demo (formerly NEXUS) |
| CI | `.github/workflows/ci.yml` + siblings | Lint, test, build, CodeQL, Pages |

There is no separate worker fleet, no live Stripe service, and no IBM Partner Plus SDK in this repository.

---

## 2–4. Scores (do not inflate)

### Engineering

| Area | Score | Evidence |
|---|---:|---|
| Architecture | 62 | Shared engine is real; commercial layer is thin |
| Code quality | 58 | Go + React maintained; leftover token names (`proBlue`) |
| Security | 68 | JWT tenancy, RBAC, no secret values on Pages |
| Authentication | 64 | JWT + optional MFA/OAuth; default secret blocked in production (this increment) |
| Authorization | 60 | `RequireRole` on mutating Enterprise paths; Pages has no RBAC |
| CBOM | 70 | CycloneDX path exists |
| Scanner accuracy | 55 | Classifiers + optional PATH tools; no published precision/recall corpus in this pass |
| PQC | 66 | Local taxonomy, not IBM Quantum hardware |
| API | 64 | Versioned `/api/v1`; scan JSON contracts stable |
| Database | 48 | Postgres when configured; in-memory demo otherwise |
| Testing | 58 | Unit/integration exist; no full E2E against a named customer fixture here |
| CI/CD | 62 | PR CI + Pages + CodeQL. Not a full staging→approval→prod SRE pipeline |
| Infrastructure | 50 | Compose/Helm exist; no backup drill evidence |
| Observability | 45 | Health endpoints; not traces + SLO alerts |
| Performance | 40 | No p50/p95 published |
| Scalability | 42 | Single-process scan-bound |
| UX/UI | 64 | Nebula tokens; Pages overlay at `/preview/` until `main` merge |
| Accessibility | 52 | Focus styles exist; no WCAG audit run this pass |
| Documentation | 70 | Honest limitations docs |
| Enterprise readiness | 38 | License + connectors + PSP + IBM APIs missing |

**Overall engineering score: 56/100**

### UX/UI

| UX Area | Score |
|---|---:|
| Brand consistency | 62 |
| Visual design | 68 |
| Information architecture | 64 |
| Navigation | 66 |
| Dashboard | 58 |
| Scan UX | 60 |
| CBOM UX | 62 |
| PQC UX | 58 |
| Accessibility | 52 |
| Responsive design | 60 |
| Error handling | 55 |
| Loading states | 58 |
| Enterprise UX | 48 |
| Performance | 44 |

**RivicQ UX/UI score: 59/100**

**Security score: 68/100** (controls in code; not a third-party audit)

**RIVICQ OVERALL SCORE: 52/100**

Weighting: product/security pull up; CRM, payments, IBM APIs, observability, and unpublished Pages theme pull down.

---

## 5–8. Backlog

| ID | Priority | Component | Root cause | Fix | Test | Status |
|---|---|---|---|---|---|---|
| P0-1 | P0 | Auth | Empty/`oss-default-secret` JWT in release | Refuse start in production | `TestResolveJWTSecret` | **Fixed this increment** |
| P0-2 | P0 | Auth | Default `DemoPass123!` bootstrap in prod | Fatal if first user would use default | code path | **Fixed this increment** |
| P0-3 | P0 | Pages | Production github.io lagged this PR | Overlay `/preview/` plus gh-pages publish from this branch | visual | **In progress** |
| P1-1 | P1 | Payments | Checkout `not_configured` | Real PSP adapter + webhook secret | — | Open |
| P1-2 | P1 | Auth | Password reset in-memory | Mailbox or operator reset | — | Open |
| P1-3 | P1 | Tenancy | DB-down Enterprise demo fallbacks | Fail closed | — | Open |
| P1-4 | P1 | IBM | No Partner APIs | Official access only | — | Open (honest stub) |
| P1-5 | P1 | UX | Console leftover amber chrome | Violet tokens on demo/inbox | visual | **Fixed this increment** |
| P2-1 | P2 | Tokens | `proBlue`/`gold` names | Rename when safe | — | Open |
| P2-2 | P2 | A11y | No WCAG audit | Contrast + SR pass | — | Open |
| P2-3 | P2 | Observability | No traces/SLO | Request IDs + metrics | — | Open |
| P2-4 | P2 | CI | Duplicate CodeQL cancel | Keep; not a product bug | — | Noted |
| P3-1 | P3 | CRM | Leads only | Do not invent Salesforce | — | By design |
| P3-2 | P3 | Graph | Source folder still `fabric/` | Keep URL `/fabric` | — | By design |

---

## 9–28. Problem register (honest)

**CI/CD.** `ci.yml` runs go test, vet, golangci-lint, frontend tsc/build. Extra workflows: CodeQL, DAST, image publish, deploy-gcp/enterprise. There is no enforced staging approval gate in this repo. Do not disable jobs to go green.

**PRs.** Template now asks for security/UX/API/Pages impact and honesty boxes. No CODEOWNERS file (would be fiction without a named team).

**Frontend.** Nebula tokens exist. Public pages use `PublicShell`. Dashboard is an inbox, not a CISO suite. Demo data must stay labeled.

**Backend / API.** ScanResult contract must not change. Commercial routes are new and thin.

**AuthN/Z.** JWT + roles. Pages cannot enforce RBAC. Edition switcher is not a license.

**Multi-tenancy.** JWT tenant on Community scan/inventory paths. Unauthenticated Home scan uses the public tenant.

**CBOM/scanner.** Real discovery + optional PATH tools. No precision/recall number invented this pass.

**PQC.** Local taxonomy. RSA-2048 classified, not auto-vulnerable.

**Database.** Optional Postgres. No backup-restore drill evidence.

**Infrastructure.** Compose/Helm documented. Production needs operator-supplied secrets.

**Testing.** Go tests + some frontend tests. This pass ran JWT unit tests + `tsc`.

**Performance / observability.** No fabricated p95. Health exists.

**UX/UI / a11y / brand.** Website theme is black + `#7C3AED`. Docs hub, contact, and markdown reader share the same 1120px shell. Preview overlay exists on this PR.

**Public Pages exposure.** `REACT_APP_SUPABASE_PUBLISHABLE_KEY` in `pages.yml` is a **publishable** client key (expected public). Do not put service-role keys in the SPA. Source maps ship with CRA builds — treat as public.

**Supply chain.** Lockfiles + Syft in CI historically. Artifact signing is not claimed.

**Documentation.** Strong honesty docs (`KNOWN_LIMITATIONS`, `PLATFORM`, `PRODUCT_STATUS`). This file is the transformation audit.

---

## 29–32. This increment

### Implemented

- Production JWT secret refuse (`resolveJWTSecret`)
- Production bootstrap password refuse
- Violet CTA lock (`websiteChrome.ts`) on public site
- Demo/inbox chips no longer use brand-amber
- PR template impact + honesty
- Design-token document (`DESIGN_SYSTEM.md`)

### Tests executed

- `go test ./internal/api/shared -count=1 -run TestResolveJWTSecret`
- `npx tsc --noEmit` in `web/` (earlier this branch)

### Remaining blockers

- Merge to `main` for durable github.io theme
- Postgres + unique `JWT_SECRET` + TLS for any real tenant
- Licensed Enterprise binary
- Real PSP and official IBM APIs
- Backup drill and named-fixture performance run

---

## 33. Classification

**PILOT READY** for the Community scan engine (CLI / self-hosted API / labeled Pages demo).

**NOT READY** as a paid multi-tenant SaaS with live cloud attach, billing, and IBM co-sell.

Not DEVELOPMENT-only (the engine works). Not PRODUCTION READY. Not ENTERPRISE READY.

---

## 34. Roadmap (technical phases, not a calendar promise)

**Phase A — stop the leaks (maps to “first hardening”)**  
Ship nebula on `main`. Keep JWT/bootstrap production guards. No fake CRM. Pages overlay until merge.

**Phase B — operator truth**  
Fail closed when DB is down. Mailbox or operator password reset. Findings/scan UX on real API status only. WCAG pass on Overview + Scanner + Contact.

**Phase C — commercial control plane**  
PSP adapter + webhooks. Official IBM access before any live badge. Request IDs, metrics, backup drill, named-fixture latency.

---

## What this pass did not do

It did not rewrite every dashboard widget, invent a 50-entity CRM, add Stripe, claim scanner precision, publish p99 numbers, or mark the product Enterprise Ready. Those would violate the honesty rule in this repository.
