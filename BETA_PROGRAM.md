# RivicQ beta program

**Status:** open for qualified teams · **Product:** Community CBOM engine + labeled Enterprise UI; separate standalone EaaS beta preview
This document is not a certification, SLA, or IBM Partner Plus API contract. CSPM beta claims and the standalone EaaS beta are distinct: EaaS is a local sandbox service on branch `feature/eaas-product-foundation`, not a hosted or production-ready product, and is excluded from CSPM scores and pilot claims.

---

## What you get

- Community CBOM scanning (website, host, IP, server, declared Kubernetes inventory, declared hardware/firmware)
- Local PQC taxonomy (Shor/Grover classes → ML-KEM / ML-DSA / SLH-DSA). **Not IBM Quantum hardware jobs.**
- Operator mappings for DORA, NIS2, BSI, FIPS, OWASP API Top 10, OWASP Top 10, WSTG network hygiene, and a RivicQ quantum checklist. **Mappings are not certifications.**
- Optional PATH scanners when installed: Syft, Trivy, Grype, Gitleaks, OSV
- Labeled demo workspace (Community operator). Admin control-plane access is a local bootstrap account, not the public demo.
- Separate EaaS beta preview: standalone API on `:9091` (`cmd/eaas`, `internal/eaas`), developer portal at `/` and `/portal` (`web/eaas/index.html`), Free = 10,000 operations/month and 60 RPM, hashed API keys shown once, metadata-only usage events. Classical operations use the Go standard library; ML-KEM-768 / ML-DSA-65 are Experimental; SLH-DSA is not implemented.

## What you do not get in beta

- Live Stripe checkout or stored card data
- IBM seller, marketplace, or Partner Plus APIs (`ibm_apis_connected` stays false until those APIs exist)
- eBPF / Cilium live traffic inspection
- Firmware reverse-engineering or semiconductor die inspection
- SOC 2 Type II or ISO 27001 certificates (audits are not complete)
- Unlabeled Enterprise simulation mixed into Community scans
- Hosted EaaS or a production Postgres repository (`deploy/migrations/004_eaas_schema.sql` is a target schema only)
- EaaS payments, Stripe/payment webhooks, or email delivery (including verification codes)
- EaaS CAVP/FIPS validation, AI operations, quantum hardware, HSM custody, or wireless operations
- EaaS beta approval from registration: submissions are `received_pending_review` and require manual admin review (`EAAS_ADMIN_TOKEN`)

## How to enroll

1. Email **sales@rivicq.com** with subject `Beta access` and a one-line use case, or
2. Open a GitHub Discussion on this repository.
3. For EaaS only, self-register through `POST /api/beta/v1/registrations` on the standalone service. The response status is `received_pending_review`; it is not approval or an invitation. Admin review listing requires `X-Admin-Token` matching `EAAS_ADMIN_TOKEN`. No email is sent (`internal/eaas/service.go`, `internal/eaas/http.go`).

Public desks only: `hello@`, `sales@`, `support@`, `security@`, `privacy@` on `@rivicq.com`. Do not mail passwords or customer secrets to those aliases.

## Local evaluation (no secrets in git)

Set environment variables locally. Never commit real passwords.

- Community API: port **8080**
- Enterprise API: port **9090** (requires a real `CRYPTOBOM_LICENSE_KEY` starting with `ENT-`)
- `DEMO_MODE=true` enables `GET /auth/demo` (Community operator JWT). Production runtime refuses demo access.
- Bootstrap admin: `AUTH_BOOTSTRAP_EMAIL` + `AUTH_BOOTSTRAP_PASSWORD` (must not be the development default in production)
- Community demo operator: `AUTH_DEMO_EMAIL` (defaults to `demo@rivicq.local` on first empty database)

GitHub Pages has **no API**. Use `/demo` for a labeled CSPM static workspace.

EaaS local evaluation (separate binary, separate state file):

- EaaS API/portal: port **9091** (`EAAS_ADDR`), default state file `./data/eaas-store.json` (`EAAS_DATA_FILE`) — treat it as sensitive because server-held private key bytes are stored base64 there
- `EAAS_ENV` (default `development`) suppresses the dev verification code only when set to `production`; it does not add Postgres, email, HSM, or payments
- `EAAS_ALLOWED_ORIGINS` sets the strict CORS allowlist; `EAAS_ADMIN_TOKEN` gates beta-registration review (`internal/eaas/http.go`)
- The EaaS portal is served by `cmd/eaas` at `/` and `/portal`, **not** by GitHub Pages
- Seven EaaS package tests and the full repository `go test ./...` suite passed locally; `go vet ./...` and `go build ./...` also passed (`docs/EAAS_TESTING_CI.md`)

## IBM Partner Plus

RivicQ has been **selected** for IBM Partner Plus. The in-product IBM page tracks **RivicQ readiness only**. It does not call IBM APIs and does not publish co-sell records.

## Payments

List prices on `/pricing` are configuration. Checkout stays disabled until a payment adapter is configured. Contact `sales@rivicq.com`.

For EaaS, `POST /api/eaas/v1/subscription` changes plan entitlements immediately, including Free = 10,000 operations/month and 60 RPM. No card data is collected; there is no Stripe integration, invoice, or payment webhook (`internal/eaas/service.go`, `docs/EAAS_FREEMIUM_AND_METERING.md`).
