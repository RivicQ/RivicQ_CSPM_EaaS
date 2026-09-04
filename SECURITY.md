# Security Policy

RivicQ GmbH takes the security of the Community and Enterprise products seriously. This policy covers the software in https://github.com/RivicQ/RivicQ_CSPM_EaaS.

## Scope

In scope: the Go APIs, CLI, scanners, intelligence engine, React console, GitHub Action, Helm/Compose charts, and documentation as shipped in this repository.

Out of scope for bounty-style reports (still welcome privately if severe): third-party SaaS you connect (GitHub, cloud providers, identity providers), issues that require a already-compromised admin JWT, and theoretical findings without a practical impact.

## Reporting a vulnerability

1. Email **security@rivicq.com** with a clear title and reproduction steps.
2. **Do not** create a public GitHub issue for an exploitable vulnerability.
3. Include impact, steps to reproduce, and artifacts. Do not attach live customer data.
4. We will acknowledge receipt within 48 hours and coordinate remediation and disclosure.

Privacy requests go to **privacy@rivicq.com**. Support tickets go to **support@rivicq.com**. Full directory: [docs/contact.html](docs/contact.html) / [docs/CONTACT.md](docs/CONTACT.md).

## Severity and response targets

| Severity | Examples | Acknowledge | Mitigation target |
|----------|----------|-------------|-------------------|
| Critical | Remote code execution, cross-tenant data read | 24 hours | 7 days |
| High | Privilege escalation, secret leakage in logs | 48 hours | 14 days |
| Medium / Low | Hardening, info disclosure | 72 hours | Prioritized by severity |

## Public disclosure

We coordinate public disclosure with the reporter. Request anonymity in the email if needed.

Optional: PGP-signed mail for sensitive reports.

## Safe harbor

We will not pursue legal action against researchers who:

- report in good faith to security@rivicq.com
- avoid privacy violations, destruction of data, and social engineering of RivicQ staff
- give us a reasonable window before publication

## Product notes

- GitHub Pages is static. A client demo session is **not** a production credential.
- Do not log secrets. Do not commit credentials.
- Tenant identity on Enterprise mutating APIs must come from authenticated context (JWT / API key), not spoofable headers.

Thank you for helping keep RivicQ secure.
