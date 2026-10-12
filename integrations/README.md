# Integrations scaffold (inert)

This directory is a **staged pivot toward a managed edge stack**. Nothing here is
wired into the running application. Every integration is inert until:

1. the required credentials are supplied via environment variables, **and**
2. a dedicated migration PR for the relevant phase is opened and reviewed.

No file outside `integrations/` is modified by this scaffold. `web/package.json`,
`go.mod`, and existing CI workflows are untouched.

## Integrations at a glance

| Integration | Role in the pivot | Replaces / augments | Directory |
| --- | --- | --- | --- |
| Convex | Hosted reactive backend (DB + functions + HTTP actions) | Postgres read/write path for `internal/database` | `convex/` |
| Better Auth | Identity, sessions, organizations | JWT lifecycle in `internal/authn/` | `better-auth/` |
| PostHog | Product analytics | (new) frontend telemetry | `posthog/` |
| Cloudflare R2 | Object storage (BOM reports, scan artifacts) | local disk / ad-hoc blob handling | `r2/` |
| Stripe | Payments / subscription billing | (new) plan entitlements | `stripe/` |
| n8n | Workflow automation for scan/finding events | (new) outbound notifications | `n8n/` |

## Phased cutover

| Phase | Scope | Touches prod? | Gate |
| --- | --- | --- | --- |
| 0 | This scaffold only; nothing imported or deployed | No | none (this PR) |
| 1 | Auth + analytics: Better Auth behind a flag, PostHog events | Frontend opt-in | `BETTER_AUTH_SECRET`, `REACT_APP_POSTHOG_KEY` + migration PR |
| 2 | Backend read path: Convex queries mirror Postgres reads | Read-only mirror | `CONVEX_DEPLOYMENT`, `CONVEX_URL` + migration PR |
| 3 | Write path: mutations own scans/findings; Postgres becomes a sink | Writes | migration PR + backfill |
| 4 | Payments + storage: Stripe Checkout, R2 presigned uploads | Writes | `STRIPE_*`, `R2_*` + migration PR |
| 5 | Automation: n8n consumes `scan.completed` / `finding.critical` | Async | n8n credentials + migration PR |

Each phase is independently revertible. Phases never share a PR.

## Tenant isolation is non-negotiable

The current backend derives tenant identity from validated JWT claims, never from
spoofable headers (`internal/tenant/context.go`; `X-Tenant-ID` is explicitly not a
source of truth, and empty tenant maps to `PublicTenantID`). The Convex layer must
mirror that invariant: **every tenant-scoped doc carries a `tenantId`, every query
has a `by_tenant` index, and the caller's org/tenant is derived from the auth
identity (`ctx.auth.getUserIdentity()`), never from client input.** See
`convex/convex/tenants.ts` and the org checks in `convex/convex/users.ts`.

## Conventions

- All secrets come from environment variables. `.env.example` / `.dev.vars.example`
  files contain obvious placeholders only.
- No emojis, concise comments, real current APIs.
- Repo paths referenced in the notes (`web/src/services/supabase.ts`,
  `internal/tenant/`, `internal/authn/`, `cmd/server/`) are the grounding for each
  migration step.
