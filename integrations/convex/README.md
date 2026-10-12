# Convex integration

Managed reactive backend: schema, functions, and HTTP actions that mirror the
existing Postgres domain without changing `internal/database` yet.

## Run locally

```bash
cd integrations/convex
npm install
cp .env.example .env.local         # fill in placeholders from the Convex dashboard
npx convex dev                     # generates convex/_generated, syncs schema
```

`npx convex dev` writes `convex/_generated/` and pushes `schema.ts`. The generated
files are intentionally absent from this scaffold; they appear on first run.

## Environment

| Var | Purpose |
| --- | --- |
| `CONVEX_DEPLOYMENT` | Deployment selector, e.g. `dev:adjective-animal-123` |
| `CONVEX_URL` | Client/data URL, e.g. `https://adjective-animal-123.convex.cloud` |
| `CONVEX_SITE_URL` | HTTP actions URL (used by Better Auth), set by Convex |
| `BETTER_AUTH_SECRET` | Signs Better Auth sessions/JWT; never commit |

Set server-side secrets on the deployment, not in the repo:

```bash
npx convex env set BETTER_AUTH_SECRET "$BETTER_AUTH_SECRET"
```

## Scripts

| Script | Command |
| --- | --- |
| `npm run dev` | `convex dev` |
| `npm run deploy` | `convex deploy` |
| `npm run codegen` | `convex codegen` |

## Cutover notes

### Phase 2 - read path
- Mirror reads for `organizations`, `tenants`, `assets`, `scans`, `findings`,
  `boms`, `apiKeys`, `auditLogs` into queries under this folder.
- Point `web/src/services/supabase.ts`-style call sites at these queries only after
  the read mirror matches Postgres for a full scan cycle. Keep Postgres authoritative.

### Phase 3 - write path
- Move `createScan` / result recording into Convex mutations (`convex/scans.ts`).
- Add a sink that writes Postgres back from Convex until decommission.
- Preserve tenant scoping exactly as `internal/tenant/context.go` does: derive the
  tenant from the identity, reject mismatches, default to `PublicTenantID` only for
  the public Community surface.

### Auth
- `convex/auth.config.ts` registers the Better Auth provider. `convex/users.ts`
  and `convex/tenants.ts` assert org/tenant membership via `ctx.auth.getUserIdentity()`.
