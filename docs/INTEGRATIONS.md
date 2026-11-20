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
| Zoho Bookings | `ZOHO_BOOKINGS_URL`, `REACT_APP_ZOHO_BOOKINGS_URL`, `NEXT_PUBLIC_ZOHO_BOOKINGS_URL` | Public booking CTA. Defaults to the RivicQ Zoho Bookings page. No credentials |
| Zoho Mail | `ZOHO_MAIL_SMTP_HOST`, `ZOHO_MAIL_SMTP_PORT`, `ZOHO_MAIL_USERNAME`, `ZOHO_MAIL_PASSWORD`, `ZOHO_MAIL_FROM`, `ZOHO_MAIL_TO` | Optional lead notification by SMTP. Disabled until credentials are set. Secrets stay local |
| Zoho CRM | `ZOHO_CRM_ACCOUNTS_URL`, `ZOHO_CRM_API_URL`, `ZOHO_CRM_CLIENT_ID`, `ZOHO_CRM_CLIENT_SECRET`, `ZOHO_CRM_REFRESH_TOKEN` | Optional lead creation via OAuth refresh token. Disabled until credentials are set |
| IBM Partner Plus | none | `GET /api/v1/ibm` is RivicQ readiness. **No IBM seller or marketplace APIs** |

### Zoho setup

Set only the variables you need in the local environment; none belong in git. Defaults use the EU Zoho endpoints: `smtp.zoho.eu:587` for mail and `https://accounts.zoho.eu` for CRM OAuth. For a `.com` tenant, set `ZOHO_CRM_ACCOUNTS_URL=https://accounts.zoho.com` and, if needed, `ZOHO_CRM_API_URL` to the CRM API domain from your Zoho account.

`POST /api/v1/leads` still succeeds when Zoho is unconfigured or temporarily unavailable; configuration and failures are reported in logs and `/api/v1/platform/status` without exposing credentials. Bookings is public and does not require credentials.

Public desks remain `hello@`, `sales@`, `support@`, `security@`, and `privacy@` at `rivicq.com`. Automated mail defaults to `noreply@rivicq.com` → `sales@rivicq.com` once Zoho Mail credentials are configured. `admin@rivicq.com` is not a public mailbox.

Do not invent IBM endpoints. Official Partner Plus access is required before any IBM API adapter is marked live.

## Enterprise connectors

Delve, Kertos, live cloud attach, and SSO/OIDC need credentials and a commercial contract. They are not implied by installing Trivy.
