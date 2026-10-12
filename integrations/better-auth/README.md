# Better Auth integration

Replaces the hand-rolled JWT lifecycle in `internal/authn/` with Better Auth:
email/password, sessions, and organizations (multi-tenant grouping). The
authoritative store is Convex (see `../convex/`).

## Environment

| Var | Purpose |
| --- | --- |
| `BETTER_AUTH_SECRET` | Signs session tokens and JWTs. Required; no default. |
| `BETTER_AUTH_URL` | Public base URL of the auth server (e.g. the Convex site URL) |
| `REACT_APP_BETTER_AUTH_URL` | Client-visible base URL (CRA env prefix) |

For the Convex deployment, set the secret server-side:
`npx convex env set BETTER_AUTH_SECRET "$BETTER_AUTH_SECRET"`.

## Server config (`auth.ts`)

- `betterAuth({...})` with `emailAndPassword` and the `organization` plugin.
- `database` is the Convex adapter from `@convex-dev/better-auth`; the real
  instance is assembled in `convex/auth.ts` where the component client exists.
- `secret` is read from the environment only.

## Client (`client.ts`)

- `createAuthClient` from `better-auth/react`, base URL from
  `process.env.REACT_APP_BETTER_AUTH_URL`.
- Drop-in replacement for the `supabaseAuthService` surface in
  `web/src/services/supabase.ts`; wire it behind a flag in phase 1.

## Migration from `internal/authn/`

| Existing (`internal/authn/`) | Better Auth |
| --- | --- |
| `Role` admin/operator/analyst/viewer | organization member role (keep the same strings) |
| `Edition` oss/professional/enterprise | organization plan / entitlement |
| access + rotating refresh tokens, reuse detection | session cookie + JWT; rotation handled by Better Auth |
| `Purpose` verify/reset/MFA tokens | built-in email verification, reset, and 2FA plugins |
| `User.TenantID` | organization `tenantId` claim (see `../convex/convex/tenants.ts`) |

Preserve the `internal/tenant/context.go` invariant: the tenant comes from the
authenticated identity, never from a request header.
