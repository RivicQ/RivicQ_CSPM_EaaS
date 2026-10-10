# Optional scanner integrations

RivicQ’s built-in discovery engine always runs. These **outsourced** tools are optional: if the binary is on `PATH`, `rivicq scan .` and scan intelligence invoke it. If it is missing, the scan continues.

Set `RIVICQ_EXTERNAL_TOOLS=0` to disable every PATH scanner.

GitHub Pages has **no API** and cannot run these tools. You need the CLI or a running Community (`:8080`) / Enterprise (`:9090`) backend.

## Invoked when installed

| Tool | What RivicQ uses | Honesty |
|------|------------------|---------|
| [Syft](https://github.com/anchore/syft) | CycloneDX SBOM; crypto-named components become LOW findings | Not a live estate inventory |
| [Trivy](https://aquasecurity.github.io/trivy/) | `trivy fs --scanners vuln` | Real advisory IDs only |
| [Grype](https://github.com/anchore/grype) | Directory vulnerability match | Real advisory IDs only |
| [Gitleaks](https://github.com/gitleaks/gitleaks) | Secrets detect (`--no-git`) | **Secret values are never stored** in findings |
| [OSV Scanner](https://github.com/google/osv-scanner) | Lockfile / SBOM match | Real OSV IDs only |

`testdata/`, `fixtures/`, `node_modules/`, `vendor/`, `web/build/`, and `.git/` are skipped.

## Probed, not executed

Semgrep, Checkov, Cosign, and CodeQL are recorded as on/off PATH (`GET /api/v1/intelligence/tools`). They are not launched by `rivicq scan` (slow or network-heavy).

## Operator checks

```bash
rivicq scan .
# table footer lists used vs on-PATH tools

curl -s http://127.0.0.1:8080/api/v1/intelligence/tools
curl -s http://127.0.0.1:8080/api/v1/ecosystem/tools
```

The DevSecOps Tools page in the console shows the same PATH probe when a backend is running.

## Commercial adapters (not systems of record)

| Adapter | Env | Honesty |
|---------|-----|---------|
| Leads | in-memory / `commercial_leads` when Postgres is up | `POST /api/v1/leads` — public; list is admin JWT |
| Payments | `RIVICQ_PAYMENTS_WEBHOOK_SECRET` or `STRIPE_SECRET_KEY` | Stub only. No Stripe SDK. No PAN/CVV. Checkout stays `not_configured` until a real PSP adapter is implemented |
| Discord | `DISCORD_WEBHOOK_URL` | Optional notify. Email, tokens, and secrets are stripped. Discord is never the CRM |
| IBM Partner Plus | none | `GET /api/v1/ibm` is RivicQ readiness. **No IBM seller or marketplace APIs** |

Do not invent IBM endpoints. Official Partner Plus access is required before any IBM API adapter is marked live.

## Enterprise connectors

Delve, Kertos, live cloud attach, and SSO/OIDC need credentials and a commercial contract. They are not implied by installing Trivy.
