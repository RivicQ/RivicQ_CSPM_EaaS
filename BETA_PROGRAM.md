# RivicQ beta program

**Status:** open for qualified teams · **Product:** Community CBOM engine + labeled Enterprise UI  
This document is not a certification, SLA, or IBM Partner Plus API contract.

---

## What you get

- Community CBOM scanning (website, host, IP, server, declared Kubernetes inventory, declared hardware/firmware)
- Local PQC taxonomy (Shor/Grover classes → ML-KEM / ML-DSA / SLH-DSA). **Not IBM Quantum hardware jobs.**
- Operator mappings for DORA, NIS2, BSI, FIPS, OWASP API Top 10, OWASP Top 10, WSTG network hygiene, and a RivicQ quantum checklist. **Mappings are not certifications.**
- Optional PATH scanners when installed: Syft, Trivy, Grype, Gitleaks, OSV
- Labeled demo workspace (Community operator). Admin control-plane access is a local bootstrap account, not the public demo.

## What you do not get in beta

- Live Stripe checkout or stored card data
- IBM seller, marketplace, or Partner Plus APIs (`ibm_apis_connected` stays false until those APIs exist)
- eBPF / Cilium live traffic inspection
- Firmware reverse-engineering or semiconductor die inspection
- SOC 2 Type II or ISO 27001 certificates (audits are not complete)
- Unlabeled Enterprise simulation mixed into Community scans

## How to enroll

1. Email **sales@rivicq.com** with subject `Beta access` and a one-line use case, or
2. Open a GitHub Discussion on this repository.

Public desks only: `hello@`, `sales@`, `support@`, `security@`, `privacy@` on `@rivicq.com`. Do not mail passwords or customer secrets to those aliases.

## Local evaluation (no secrets in git)

Set environment variables locally. Never commit real passwords.

- Community API: port **8080**
- Enterprise API: port **9090** (requires a real `CRYPTOBOM_LICENSE_KEY` starting with `ENT-`)
- `DEMO_MODE=true` enables `GET /auth/demo` (Community operator JWT). Production runtime refuses demo access.
- Bootstrap admin: `AUTH_BOOTSTRAP_EMAIL` + `AUTH_BOOTSTRAP_PASSWORD` (must not be the development default in production)
- Community demo operator: `AUTH_DEMO_EMAIL` (defaults to `demo@rivicq.local` on first empty database)

GitHub Pages has **no API**. Use `/demo` for a labeled static workspace.

## IBM Partner Plus

RivicQ has been **selected** for IBM Partner Plus. The in-product IBM page tracks **RivicQ readiness only**. It does not call IBM APIs and does not publish co-sell records.

## Payments

List prices on `/pricing` are configuration. Checkout stays disabled until a payment adapter is configured. Contact `sales@rivicq.com`.
