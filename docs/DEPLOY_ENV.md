# Deployment Environment Variables

Use these variables for local, CI, and production deployments.

## Core
- `REACT_APP_API_URL`: Browser API base URL, usually `http://localhost:8080/api/v1`.
- `DATABASE_URL`: PostgreSQL connection string used by the API server and migrations.
- `JWT_SECRET`: Signing secret for authentication tokens.
- `AUTH_ALLOWED_DOMAINS`: Comma-separated email domains allowed to sign in.

## Enterprise
- `IBMQ_API_KEY`: IBM Quantum API key for enterprise quantum workflows.
- `IBM_CLOUD_API_KEY`: IBM Cloud API key for enterprise deploys.
- `IBM_HPCS_INSTANCE`: IBM Hyper Protect Crypto Services instance identifier.

## Platform
- `DEMO_MODE`: Optional feature flag for legacy demo compatibility; keep `false` for live-only deployments.
- `CRYPTOBOM_PORT`: Server port used by local run scripts.

## Notes
- Keep secrets out of source control.
- Use CI secrets or environment-specific secret stores for production.
- Prefer live API endpoints over seeded or mock data paths.
