# Privacy notice — RivicQ Community project

**Effective:** 3 September 2026 · **Controller (this GitHub project):** RivicQ GmbH, Berlin

This notice describes how the **public Community repository and GitHub Pages demo** relate to personal data. It is not a customer Data Processing Agreement. Enterprise customers receive contractual privacy terms with their commercial license.

Scope: CSPM and its Pages demo are covered first. The standalone EaaS build on `main` is a separate, locally operated sandbox service (`cmd/eaas`, `internal/eaas`, `web/eaas`); it is not hosted by RivicQ GmbH and is excluded from CSPM pilot/production claims and scores. EaaS data practices are described below.

---

## What this project is

| Surface | Personal data |
|---------|----------------|
| **This GitHub repository** | GitHub processes contributor identities under GitHub’s own terms. RivicQ GmbH sees public commits, issues, and PRs you choose to publish. |
| **GitHub Pages** (https://rivicq.github.io/RivicQ_CSPM_EaaS/) | A **static** React application. There is **no RivicQ production API** on Pages. A labeled demo session is stored in the browser (`rivicq-demo-session`) and is **not a JWT**. |
| **RivicQ Graph demo** (`/fabric`) | Static labeled fixture. No payment, no secret values, no production inventories. |
| **Supabase on Pages** (if you sign in) | Authentication is handled by the configured identity provider. See that provider’s privacy policy. Do not use production passwords you reuse elsewhere. |
| **Self-hosted Community or Enterprise API** | **You** are the operator. Logs, scan targets, and inventory live in your environment. Configure retention, access control, and subprocessors yourself ([docs/DEPLOY_ENV.md](docs/DEPLOY_ENV.md)). |
| **Standalone EaaS service** (`cmd/eaas`, default `:9091`) | **You** operate it locally. Accounts, hashed API keys/session tokens, beta registrations, and usage events live in a sandbox JSON state file (default `./data/eaas-store.json`). No RivicQ-hosted EaaS API, mailer, or payment processor is part of this build. |

RivicQ GmbH does **not** use the public Pages demo to collect customer cryptographic inventories. The EaaS portal is served by the standalone binary at `/` and `/portal`, not by GitHub Pages (`docs/EAAS_DEPLOYMENT.md`).

---

## What we ask you not to send

Do not put in issues, pull requests, datasets, or fixtures:

- production secrets, tokens, private keys, or customer hostnames
- personal data of third parties
- live telemetry from a regulated estate

Synthetic samples only: [DATASETS.md](DATASETS.md).

---

## Cookies and local storage (Pages demo)

The static app may store edition preference, theme, and an isolated demo marker in **local / session storage** on your device so the UI can resume a labeled walkthrough. That data does not transmit a customer estate to RivicQ GmbH.

GitHub Pages and any identity provider you use may set their own cookies. Review GitHub and (if used) Supabase privacy documentation.

---

## EaaS data handling

The EaaS API stores account details, bcrypt password hashes, hashed bearer session tokens, hashed API keys with a derived prefix, project metadata, hashed verification codes, subscriptions, beta registrations, and usage events in the sandbox state file (`internal/eaas/service.go`, `internal/eaas/store.go`). API keys are shown once and never stored in plaintext; sessions expire and logout removes the stored hash. Verification codes are returned only in non-production with an explicit notice — **no email is delivered**.

Server-held crypto keys are generated locally. Public keys may be returned by the API; private key bytes are **never returned**, but are stored base64 in the sandbox state file (`SigningKey.PrivateB64`, `internal/eaas/store.go`). Protect that file with filesystem permissions. This is not HSM/KMS custody, and there is no CAVP/FIPS validation.

Usage events are metadata-only: identifiers, operation, category, status, error code, latency, and timestamp. No plaintext, ciphertext, signature, shared secret, or key is written to a usage event (`internal/eaas/store.go:91-105`, `internal/eaas/service.go:754-829`). The target PostgreSQL schema (`deploy/migrations/004_eaas_schema.sql`) mirrors this rule, but no production Postgres repository is implemented.

The EaaS portal stores a session token in browser `sessionStorage`. Strict CORS is controlled by `EAAS_ALLOWED_ORIGINS`; unlisted origins receive no allow-origin header (`internal/eaas/http.go:80-102`). See [EaaS security & privacy](docs/EAAS_SECURITY_PRIVACY.md).

## EaaS beta registrations

`POST /api/beta/v1/registrations` collects name, work email, organisation, role, use case, edition/deployment/integration interests, and explicit consent (`internal/eaas/service.go:862-909`). Submissions are stored with status `received_pending_review` and are not approvals or invitations. Listing registrations requires `X-Admin-Token` matching `EAAS_ADMIN_TOKEN` on the local service (`internal/eaas/http.go:374-382`). There is no email delivery, CRM integration, or marketing subscription in the EaaS build. Selecting an "interest" such as AI, quantum, hardware_hsm, or wireless does not mean that capability exists.

---

## Security reports

If a report must include personal data to demonstrate impact, send it to security@rivicq.com per [SECURITY.md](SECURITY.md), not as a public issue.

---

## Your rights

Data-subject requests: **privacy@rivicq.com**. For data RivicQ GmbH stores about you as a Community contributor (for example, an email you send to security@ or legal@), you may request access or deletion at those addresses, subject to legal retention (including security incident records).

GitHub account data is controlled by GitHub.

---

## Changes

Material changes to this notice will be committed to this file. The date at the top is the last update.

Related: [LEGAL.md](LEGAL.md) · [SECURITY.md](SECURITY.md) · [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
