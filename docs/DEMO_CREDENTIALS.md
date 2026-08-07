# Demo Credentials (local / staging only)

These credentials are provided for local development and demo purposes only. Do **NOT** use them in production.

## Three-tier demo set

All demo users share the password **`DemoPass123!`** and belong to the `rivicq.de` work domain.

| Tier | Role | Email | Password |
|---|---|---|---|
| Enterprise | Admin | `revan.ande@rivicq.de` | `DemoPass123!` |
| Professional | Operator | `pratik.rughe@rivicq.de` | `DemoPass123!` |
| Professional | Analyst | `danush.m@rivicq.de` | `DemoPass123!` |
| Community | Viewer | `sales@rivicq.de` | `DemoPass123!` |

Edition is resolved automatically:
- `admin` → Enterprise
- `operator` / `analyst` → Professional
- `viewer` → Community (reported as `oss` by the API, normalized to Community in the UI)

## One-click demo access (no credentials)

The server exposes a quick-access endpoint that issues a token for the Demo User:

```
GET /api/v1/auth/demo                 # Community
GET /api/v1/auth/demo?edition=enterprise   # Enterprise
GET /api/v1/auth/demo?edition=professional # Professional
```

Returns `demo@cryptobom.io` (role `admin`, `demo_mode: true`).

## How to use

1. Copy `.env` (gitignored) or `.env.demo` into your environment (or `source` it) and start the server.
2. The auth store picks up `AUTH_BOOTSTRAP_EMAIL` / `AUTH_BOOTSTRAP_PASSWORD` to create the Enterprise admin bootstrap user.
3. Database-backed setups can seed all four users with:

   ```bash
   source .env.demo
   DATABASE_URL=$DATABASE_URL scripts/create-demo-users.sh
   ```

## Security

- These demo credentials are intentionally shared/weak for convenience. Replace them with unique passwords and rotate keys before any public or staging deployment.
- `.env` is gitignored — keep it out of the repository. Never commit `JWT_SECRET`, OAuth client secrets, or personal access tokens.
- Rotate the demo JWT secret and any GitHub OAuth / PAT that has been shared (see `.env` comments).
