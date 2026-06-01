# Demo Credentials (local / staging only)

These credentials are provided for local development and demo purposes only. Do NOT use them in production.

- Admin (bootstrap): revan.ande@rivicq.de / DemoPass123!
  - Name: Revan Ande
  - Role: admin

- Operator: pratik.rughe@rivicq.de / DemoPass123!
  - Role: operator

- Viewer: sales@rivicq.de / DemoPass123!
  - Role: viewer

How to use
- Copy `.env.demo` to your environment (or source it) and start the server in dev mode.
- The auth store will pick up `AUTH_BOOTSTRAP_EMAIL` and `AUTH_BOOTSTRAP_PASSWORD` to create the bootstrap user.

Security
- These demo credentials are intentionally weak for convenience. Replace them with secure passwords and rotate keys before any public/staging deployment.
