# Known limitations

Honest constraints for operators and evaluators.

> Current status: PARTIALLY IMPLEMENTED — controlled pilot ready for static cryptographic inventory; production Enterprise remains BLOCKED BY EXTERNAL CONFIGURATION. Next: validate the buyer, trigger, and authorized source tree with five security-leader interviews by 2026-11-24, then ship the workflow, console, scanner, evidence, security, accessibility, and release-readiness roadmap.

## GitHub Pages

https://rivicq.github.io/RivicQ_CSPM_EaaS/ is a **static** React build.

- There is no production API on Pages.
- Public GitHub scans require a running API (`make dev-backend`) or the CLI.
- Demo Access on Pages is an isolated client session (`rivicq-demo-session`), not a JWT, and cannot see customer data.
- `GET /api/v1/auth/demo` is issued only when `DEMO_MODE` is enabled on a backend.
- `/fabric` is a separate labeled RivicQ Graph demo (wordmark GRAPH; formerly NEXUS / FABRIC). It uses synthetic Northbridge Exchange data, never renders secret values, and does not collect payment or attach live cloud/IdP/vault credentials.
- Pages publishes CSPM documentation and demos only. It does not serve the EaaS portal or API.

## Encryption as a Service (separate surface)

EaaS is a standalone binary (`cmd/eaas`, `internal/eaas`, `web/eaas`), not part of the CSPM pilot
or the Pages site. Do not apply the CSPM claims above to it.

- Default listen address is `:9091`; API routes are `/api/eaas/v1/*` and `/api/beta/v1/*`. The
  portal at `/` and `/portal` is served by the EaaS binary (`EAAS_STATIC_DIR`), not GitHub Pages.
- Runtime state is an atomic JSON sandbox file. No Go Postgres repository exists;
  `deploy/migrations/004_eaas_schema.sql` is a target schema only. There is no hosted deployment.
- No Stripe/payment collection, payment webhooks, or email delivery (verification codes are shown
  only in development). No HSM/KMS custody, FIPS/CAVP validation, AI operations, quantum hardware,
  or wireless operations.
- Numeric monthly quotas and RPM limits are enforced. Plan flags for SSO, HSM, audit log, and
  advanced analytics are display-only, not entitlement gates.
- Classical crypto (AES-256-GCM, HMAC-SHA-256, SHA-256, `crypto/rand`) is implemented; ML-KEM-768
  and ML-DSA-65 are `Experimental` via `cloudflare/circl`. SLH-DSA is not implemented.
- `.github/workflows/eaas-ci.yml` is path-filtered gofmt/vet/build/test only: no race detection,
  coverage, govulncheck, migration validation, portal build, container build, or deploy gate.

See [EAAS_LIMITATIONS.md](EAAS_LIMITATIONS.md), [EAAS_PRODUCT_STATUS.md](EAAS_PRODUCT_STATUS.md),
and [EAAS_TESTING_CI.md](EAAS_TESTING_CI.md).

## Scanner accuracy

- RSA-2048 is **classified**, not automatically marked vulnerable.
- Firmware/identity analysis (`rivicq firmware|identity`) is **static and
  evidence-based** (strings/sections/records). It does not disassemble, execute,
  flash, read fuses, or reverse engineer silicon, and it never extracts private
  keys or SIM/SE/subscriber secrets. See [FIRMWARE_ANALYSIS.md](FIRMWARE_ANALYSIS.md)
  and [IDENTITY_CRYPTO.md](IDENTITY_CRYPTO.md).
- Library *presence* is reported distinctly from algorithm *use*. Detection is
  token-boundary matched to avoid cross-algorithm false positives.
- `firmware`/`identity` API routes (`/api/v1/firmware/*`, `/api/v1/identity/*`)
  are available in both OSS and Enterprise editions (reads require `cbom:read`,
  analysis requires `scans:start`); the CLI remains a first-class surface. See
  [FIRMWARE_IDENTITY_API.md](FIRMWARE_IDENTITY_API.md). Live Infineon/G+D
  connectors are **P2** and marked `CONNECTOR REQUIRED`.
- CVE overlay uses **exact** package versions. Rejected NVD entries are not treated as vulns.
- Optional PATH tools (Syft, Trivy, Grype, Gitleaks, OSV Scanner) run on local directory scans when installed. They are skipped when missing. Set `RIVICQ_EXTERNAL_TOOLS=0` to disable. Gitleaks findings never include secret values. See [INTEGRATIONS.md](INTEGRATIONS.md).
- `rivicq scan . --fail-on critical|high` (severity) in addition to policy BLOCK/WARN. See [CORE_ENGINE.md](CORE_ENGINE.md).
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

## Enterprise (private beta)

- Cloud inventory and external connectors need real credentials; without them the UI/API should present unconfigured or empty states, not fabricated estates.
- SSO configuration support may exist, but a complete SAML/OIDC IdP ACS/login handshake is an operator integration task and should be validated per environment.
- Compliance outputs are **control mappings/evidence aids**, not certifications.
- RBAC roles (Admin, Operator, Analyst, Viewer) are intended for covered routes; verify admin-only enforcement for mutating SSO/cloud-connector/API-key/webhook/workspace operations in the deployed build.
- API keys and webhooks require authenticated tenant context. The `X-Tenant-ID` header is not a source of truth.
- Scan, inventory, findings, and intelligence resources are intended to be tenant-scoped for protected paths. Unauthenticated or demo flows may use a public/demo tenant; cross-tenant access to protected scan resources should return not found/denied behavior as enforced.
- Enterprise Helm chart templates may be absent or incomplete in the current tree; treat deployment claims as artifact-dependent and verify before pilot use.

## Third-party names

Optional cloud or quantum connectors use customer credentials. Control mappings are not certifications.

## Datasets

See [DATASETS.md](../DATASETS.md). Samples are synthetic. Do not commit secrets.
