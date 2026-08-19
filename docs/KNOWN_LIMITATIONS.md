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

## Enterprise

- Cloud inventory needs real credentials; disconnected connectors show empty states.
- SAML configuration can be stored; a complete IdP ACS handshake is an operations task with your identity provider.
- Compliance PDFs and dashboards are **control mappings**, not certifications.
- RBAC roles: Admin, Operator, Analyst, Viewer. Mutating SSO and cloud-connector APIs require **Admin**. `RequireRole` is enforced on those routes.
- API keys and webhooks require a JWT (or API-key) **tenant claim**. The `X-Tenant-ID` header is not a source of truth.

## IBM trademarks

IBM, IBM Plex, and Carbon are trademarks of IBM. RivicQ is not an IBM product. Control mappings are not certifications. Optional IBM Cloud / IBM Quantum connectors require customer credentials and are not IBM-endorsed.

## Datasets

See [DATASETS.md](DATASETS.md). Samples are synthetic. Do not commit secrets.
