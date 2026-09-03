# Known limitations

Honest constraints for operators and evaluators.

## GitHub Pages

https://rivicq.github.io/RivicQ_CSPM_EaaS/ is a **static** React build.

- There is no production API on Pages.
- Public GitHub scans require a running API (`make dev-backend`) or the CLI.
- Demo Access on Pages is an isolated client session (`rivicq-demo-session`), not a JWT, and cannot see customer data.
- `GET /api/v1/auth/demo` is issued only when `DEMO_MODE` is enabled on a backend.

## Scanner accuracy

- RSA-2048 is **classified**, not automatically marked vulnerable.
- CVE overlay uses **exact** package versions. Rejected NVD entries are not treated as vulns.
- Detector source files (`tls_scanner.go`, etc.) and `fixtures/` / `testdata/` are skipped on default `rivicq scan .` so the engine does not fail its own self-scan.
- eBPF / Cilium is an **optional integration**, not a shipped kernel program.

## Authentication

- Login, register, TOTP MFA, Google/GitHub OAuth, and JWT refresh are implemented on `/api/v1/auth`.
- Password reset is **in-memory** (30-minute single-use token). There is no mailbox product. In `DEMO_MODE` the API may return a labeled `reset_token` so local demos can complete the flow. Production must never email-spoof.
- `PATCH /auth/me` updates display name. Email is the sign-in identifier.
- Workspace user listing and role changes require **Admin** (`GET /auth/workspace/users`).
- SAML configuration can be stored; a complete IdP ACS handshake is an operations task with your identity provider.

## Scores and Qiskit

- Qiskit estate / audit scores are a **local classical taxonomy** (`internal/quantum/qiskitprofile`). They do not run IBM Quantum hardware.
- Optional Python Aer (`sdk/python/rivicq_qiskit`) is educational.
- Compliance dashboards remain **control mappings**, not certifications.

## Enterprise

- Cloud inventory needs real credentials; disconnected connectors show empty states.
- SAML configuration can be stored; a complete IdP ACS handshake is an operations task with your identity provider.
- Compliance PDFs and dashboards are **control mappings**, not certifications.
- RBAC roles: Admin, Operator, Analyst, Viewer. Mutating SSO and cloud-connector APIs require **Admin**. `RequireRole` is enforced on those routes.
- API keys and webhooks require a JWT (or API-key) **tenant claim**. The `X-Tenant-ID` header is not a source of truth.

## Third-party names

Optional cloud or quantum connectors use customer credentials. Control mappings are not certifications.

## Datasets

See [DATASETS.md](DATASETS.md). Samples are synthetic. Do not commit secrets.
