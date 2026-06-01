# Team Sizing & Roles — RivicQ Encryption as a Service

This document recommends an initial team structure to build, operate, and support the product.

Recommended teams and headcount (startup → scale):

- **Core Engineering (3–6)**
  - Backend engineers (2–3)
  - Frontend engineers (1–2)
  - Platform/infra engineer (1)

- **Platform & DevOps (2–4)**
  - CI/CD & build automation (1–2)
  - SRE / Kubernetes & cloud infra (1–2)

- **Security & Compliance (2–3)**
  - Application security engineer (1)
  - Compliance lead (NIST/ISO/PQC) (1)

- **QA & Test Automation (1–2)**
  - Test engineers focused on integration, e2e and security tests

- **Product & Design (1–3)**
  - Product manager (1)
  - UX/UI designer (1)
  - Technical writer / docs (1)

- **Customer Success & Sales (2–4)**
  - Enterprise sales / solutions engineer (1–2)
  - Customer success / support (1–2)

- **Data & ML (optional, 1–2)**
  - Data engineer / ML engineer (1–2) for analytics and risk scoring

Credential templates and onboarding artifacts
- `docs/DEMO_CREDENTIALS.md` contains demo user records for local use.
- Create a `secrets.example` and GitHub Actions secret list for required env vars:
  - `JWT_SECRET`, `DATABASE_URL`, `CRYPTOBOM_BOOTSTRAP_PASSWORD`, `AUTH_ALLOWED_DOMAINS`, `IBMQ_API_KEY`, `IBMQ_ENDPOINT`, `HSM_SECRET`.

Notes
- For early-stage development (MVP), a compact team of 6–10 engineers + 2 product/design is sufficient.
- For enterprise readiness and 24/7 support, scale platform and security teams to 8–12.

