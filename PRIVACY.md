# Privacy notice — RivicQ Community project

**Effective:** 3 September 2026 · **Controller (this GitHub project):** RivicQ GmbH, Berlin

This notice describes how the **public Community repository and GitHub Pages demo** relate to personal data. It is not a customer Data Processing Agreement. Enterprise customers receive contractual privacy terms with their commercial license.

---

## What this project is

| Surface | Personal data |
|---------|----------------|
| **This GitHub repository** | GitHub processes contributor identities under GitHub’s own terms. RivicQ GmbH sees public commits, issues, and PRs you choose to publish. |
| **GitHub Pages** (https://rivicq.github.io/RivicQ_CSPM_EaaS/) | A **static** React application. There is **no RivicQ production API** on Pages. A labeled demo session is stored in the browser (`rivicq-demo-session`) and is **not a JWT**. |
| **Supabase on Pages** (if you sign in) | Authentication is handled by the configured identity provider. See that provider’s privacy policy. Do not use production passwords you reuse elsewhere. |
| **Self-hosted Community or Enterprise API** | **You** are the operator. Logs, scan targets, and inventory live in your environment. Configure retention, access control, and subprocessors yourself ([docs/DEPLOY_ENV.md](docs/DEPLOY_ENV.md)). |

RivicQ GmbH does **not** use the public Pages demo to collect customer cryptographic inventories.

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
