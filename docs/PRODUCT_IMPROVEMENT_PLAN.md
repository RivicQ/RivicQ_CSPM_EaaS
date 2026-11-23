# Product Improvement Plan — Archify Parity, Auth, Workflows, Early Beta

Status: **PHASE 1–3 IMPLEMENTED, PHASES 4–9 PARTIAL OR BLOCKED** (controlled feature branch: `feat/archify-parity-auth-workflows-beta-ux`)

This is a target-state addendum to [PRD.md](PRD.md) and [ROADMAP.md](ROADMAP.md). It separates **implemented**, **planned**, and **blocked** work, and preserves the existing PRD as the record of current scope. The current commercial bottleneck remains customer validation; engineering work must not be represented as PMF evidence.

## Maturity labels

| Label | Meaning |
|---|---|
| Production implemented | Deployed, monitored, and operating with real users and configured infrastructure |
| Beta implemented | Working in repo/local environment with automated evidence, not production-hardened |
| Experimental | Functional prototype; outputs may change and must be labeled |
| Integration pending | Code and contract exist, but a required external service/configuration is absent |
| Planned | Not implemented; acceptance criteria only |
| Not supported | Explicitly out of scope or unavailable |

## Current truth baseline

- Static CBOM/SBOM, CycloneDX 1.6 export, policy gate, dataset harness: **Beta implemented**.
- CSPM auth lifecycle, RBAC, tenant scoping, Enterprise license boundary: **Beta implemented**.
- Browser auth/network experience, public beta request capture, client onboarding checklist, and admin readiness reporting: **Beta implemented** on this branch; each is explicitly labeled as local, configuration-only, or pending where applicable.
- Email delivery, hosted production database, live CSPM checkout, EaaS hosted SaaS/payments/email: **Integration pending** or **Not supported** per `docs/KNOWN_LIMITATIONS.md` and `docs/EAAS_LIMITATIONS.md`.
- Archify generated diagrams and static site: **Beta implemented**; use as design source of truth, do not restyle generated artifacts.
- Native in-app animated workflow studio: **Beta implemented** in this branch; the player content is labeled `SIMULATED`, with 10 workflows including the 30-stage DevSecOps lifecycle.
- Account Centre: **Beta implemented** where the backend supports persistence; integrations remain **Integration pending**.
- External integrations remain unconfigured/unverified: hosted DB/RLS, email, OAuth provider config, payments/checkout, cloud credentials, IBM Quantum/HPCS credentials, HSM/QKD/QRNG hardware, and wireless operations. The admin readiness endpoint reports these boundaries without cloud, quantum, EaaS, email, payment, or hardware probes.

## Implemented in this branch

- `web/src/data/workflows.ts`: 10 typed workflow definitions, including the 30-stage DevSecOps lifecycle with inputs, outputs, checks, tools, success/failure criteria, evidence, maturity, and gates.
- `web/src/components/workflow/WorkflowStudio.tsx`: accessible data-driven player with autoplay, pause, step controls, speed, manual selection, reduced-motion handling, static stage list, maturity/gate chips, and Archify map link.
- Public `/workflows` and authenticated `/workflow-studio` routes, linked from the public navigation and operator palette.
- `web/src/pages/AccountCenter.tsx`: Profile, Security, Workspace, Integrations, Developer, Preferences, and Privacy tabs with honest integration states.
- Auth shell consolidation onto shared `AuthChrome`, collapsed optional registration fields, OAuth availability states, password visibility, and return-to-original-page after MFA.
- `web/src/services/network.ts` and `web/src/services/api.ts`: an 8-second request timeout, one delayed retry for idempotent GETs, normalized error messages, and friendly network messages; login, register, and MFA no longer show a raw "Network Error".
- `web/src/config/editions.ts`: backend discovery short-circuits on static HTTPS pages unless `REACT_APP_API_URL` is explicit, so disconnected pages do not probe local ports or imply a hosted backend.
- `web/src/context/AuthContext.tsx` and `web/src/pages/AuthPage.tsx`: sessions are accepted only after server validation; login, register, and MFA errors are friendly; the disconnected state offers the labeled demo plus request-demo, sales, and self-hosting routes.
- [BetaSignup.tsx](../web/src/pages/BetaSignup.tsx): public `/beta` and `/beta-signup` collect sales/interest requests, submit through `platformService.createLead` to `POST /api/v1/leads` when the backend is reachable, fall back to a mailto draft otherwise, and state "No beta approval or invitation is implied."
- [ClientOnboarding.tsx](../web/src/pages/ClientOnboarding.tsx): authenticated `/onboarding` presents a local-only checklist linking `/account`, `/demo`, `/workflow-studio`, `/diagrams`, and `/contact`; progress is stored in `localStorage` and is explicitly not a backend record.
- [readiness.go](../internal/platform/readiness.go) and [handlers.go](../internal/platform/handlers.go): authenticated admin-only `GET /api/v1/platform/readiness` reports configuration-only checks for core, auth, cloud, quantum, hardware, EaaS, and security with the six maturity labels and no secrets; no cloud, quantum, EaaS, email, payment, or hardware provider is probed.
- [ProductionReadiness.tsx](../web/src/pages/ProductionReadiness.tsx): admin-only `/readiness` renders that endpoint and shows an honest empty state when no authoritative backend is connected.
- Tests: workflow catalog, workflow player, account centre, and existing frontend suites all pass; production build compiles.

## Staged roadmap

### 1. Foundation and visual parity

Priority: high
Dependencies: existing `PRISM`, `tokens`, `nebulaSurfaces`, Archify CSS/JS sources.

Acceptance criteria:
- One token bridge remains authoritative: `web/src/theme/prism.ts`, `tokens.ts`, `designSystem.ts`, `nebulaSurfaces.ts`, `docs/assets/horizon-docs.css`, Archify CSS.
- React auth/console/workflow surfaces use the `--rvq-*` variables and shared `ARCHIFY_FONTS` rather than new hardcoded palettes.
- Generated Archify diagrams are not edited; embeds use documented `embed=1&motion=1&theme=dark` and compact plates.
- Responsive checks cover desktop, tablet, and mobile; no horizontal overflow on changed pages.
- Reduced motion is honored.

Status: **IMPLEMENTED (PARTIAL)**. Evidence: shared token bridges, AuthChrome consolidation, public/console workflow surfaces, dark-nebula lock for exact RivicQ/Archify parity, and reduced-motion handling are in this branch; screenshot regression tooling remains **Planned** and pixel-level responsive review is not yet automated.

### 2. Authentication and account experience

Priority: high
Dependencies: `internal/authn`, Supabase service, configured OAuth/email providers.

Acceptance criteria:
- Registration asks only name, work email, password, confirmation, and required consent; optional profile data moves to progressive onboarding.
- Login has password visibility, clear loading/error states, return-to-original-page behavior, and no dead OAuth buttons.
- Email verification and password reset use real expiring, single-use tokens delivered by configured email; if unconfigured, the UI states the dependency instead of claiming delivery.
- MFA enrollment, verification, disable, and recovery behavior are testable; secrets are not retained in UI state or logs.
- Account Centre covers profile, security, workspace, integrations, developer, preferences, and privacy; saved changes persist through backend APIs.

Status: **Beta implemented** / partially blocked. Backend auth lifecycle and Account Centre are in place; login, registration, and MFA now show friendly errors with no raw "Network Error", and stored sessions require server validation before entitlements are restored. Production email delivery, OAuth provider configuration, and full account persistence beyond supported endpoints remain **Integration pending**.

### 3. Console and workflow animation

Priority: high
Dependencies: `archify/spec/*.json`, generated diagrams, `web/src/motion`, `web/src/components/brand`.

Acceptance criteria:
- A reusable workflow component provides animated flow, active-stage highlighting, play/pause, previous/next, restart, speed, manual step selection, progress, and expandable technical explanations.
- DevSecOps lifecycle covers planning through audit evidence with inputs, outputs, checks, tools, success/failure conditions, and generated evidence per stage.
- Additional workflows cover CBOM lifecycle, PQC migration, cloud posture, AI model security, HSM, wireless, EaaS API, remediation, incident response, and supply chain.
- Decision gates support BLOCK/WARN/ALLOW/INFORM and remediation branches.
- All illustrative data is labeled `DEMO` or `SIMULATED`; `LIVE` is only used with real backend events.
- Keyboard interaction, focus indicators, `prefers-reduced-motion`, pause, and a readable static alternative are provided.

Status: **Beta implemented**. Evidence: 10 workflows, 30-stage DevSecOps lifecycle, accessible player, and static alternative are in this branch; illustrative content is labeled `SIMULATED`, and backend-event-driven LIVE mode remains **Integration pending**.

### 4. Community and Open-Source Cloud

Priority: high
Dependencies: Docker/Compose/Helm manifests, cloud credentials for live connectors.

Acceptance criteria:
- Scanner, CBOM/SBOM, CLI, APIs, local/self-hosted deployment, and CI integrations have reproducible quick-start documentation.
- Cloud/Kubernetes/GitHub connectors report explicit unconfigured or unavailable states rather than fabricated assets.
- Self-hosted, RivicQ-hosted SaaS, and Enterprise private deployment are distinguished in docs.

Status: **PARTIALLY IMPLEMENTED**. Core scanner and deployment manifests exist; live connectors remain **Integration pending**.

### 5. EaaS developer experience and freemium

Priority: high
Dependencies: standalone `:9091` service, configured email/payments/hosting for production.

Acceptance criteria:
- Developer can discover, register, verify, create sandbox project, obtain credentials, call API, view usage, understand quota, and see upgrade path.
- Quotas and server-side entitlements are enforced.
- Classical operations are Beta implemented; ML-KEM/ML-DSA Experimental; SLH-DSA Planned; HSM custody Integration pending.
- No FIPS/CAVP or production certification claim without evidence.

Status: **Beta implemented** for the local sandbox. Production service, billing, email, HSM, and hosted database remain **Integration pending** or **Not supported**.

### 6. Enterprise readiness

Priority: high
Dependencies: customer IdP, cloud credentials, tenant RLS, audit evidence, production database.

Acceptance criteria:
- SSO/OIDC/SAML handshake, RBAC, tenant isolation, audit evidence, and control mappings are exercised in integration tests.
- Enterprise-only APIs remain 403 on OSS and display-only plan features are not counted as enforced entitlements.
- Multi-cloud and scan endpoints report unconfigured states honestly until connected.

Status: **PARTIALLY IMPLEMENTED / INTEGRATION PENDING**. Application-level tenant scoping and license boundary exist; database RLS is Planned; live connectors and IdP are Integration pending.

### 7. AI, quantum, hardware and wireless security

Priority: medium
Dependencies: provider integrations, validated hardware/wireless sources.

Acceptance criteria:
- AI, quantum, HSM, and wireless pages use the mandated maturity labels.
- AI recommendations include evidence, uncertainty, and human-verification guidance.
- Quantum readiness distinguishes inventory, migration planning, and experimental algorithms.
- Hardware and wireless use authorized, passive discovery/configuration assessment only.

Status: **PARTIALLY IMPLEMENTED / LABELS REQUIRED**. Deterministic AI templates and quantum status APIs exist; model routing, hardware attestation, and wireless operations are not supported.

### 8. Dataset validation

Priority: medium
Dependencies: dataset sources, licences, versions, retrieval dates.

Acceptance criteria:
- Dataset registry records source, licence, version, retrieval date, schema, normalization, deduplication, and quality.
- Accuracy harness reports precision/recall, false positives/negatives, latency, and reliability without fabricated results.
- Sanitised customer datasets require disclosed legal basis.

Status: **PARTIALLY IMPLEMENTED**. Fixture harness exists; expanded registry and metrics remain Planned.

### 9. Early-beta release

Priority: high once phases 1–3 land
Dependencies: email delivery, hosted pilot or self-hosted instructions, administrative review, feedback channel.

Acceptance criteria:
- Beta landing page, Community/Enterprise/EaaS/Open-Source Cloud interests, verification, confirmation, admin review, invitations, onboarding, and feedback work end to end.
- Required registration processing is separated from optional marketing consent.
- No form silently discards submissions or falsely reports success.

Status: **Beta implemented** for request capture; release **BLOCKED** on email delivery and hosted/self-hosted operator process. Public `/beta` and `/beta-signup` submit real interest requests when the backend is reachable, use a mailto fallback when it is not, and explicitly grant no beta approval or invitation; verification, admin review, invitations, and feedback remain blocked or unimplemented.

## Test evidence required before beta release

- `web`: type-check, lint, unit tests, production build, responsive visual review, no horizontal overflow on changed pages.
- `go`: unit/integration/enterprise tests, `go vet`, race tests where available.
- Security: SAST, SCA, secret scanning, container/security checks already present in CI.
- Product: real CLI/CBOM journey, auth lifecycle with configured database, EaaS sandbox journey, explicit unconfigured states for external connectors.
- Browser: real screenshots or recorded checks; mocked functionality must not be marked as passing a real integration.

### Current evidence

- `npm run type-check`, `npm run lint`, `CI=true npm test -- --watchAll=false --coverage=false`, and `npm run build` passed for this branch.
- Jest: 21 suites, 68 tests passed.
- `go test ./...` and `go vet ./...` passed from the repository root.
- `npm run format:check` reports a pre-existing repo-wide Prettier/quote-style mismatch across 207 files; no mass reformat was performed in this change.
- Browser screenshots and device-lab responsive review were not available in the local environment; these remain **Planned** before beta sign-off.

## Change governance

Do not use this addendum to imply completed production readiness. The admin `/readiness` page and `GET /api/v1/platform/readiness` are diagnostics, not a production-readiness certificate; per-check `Production implemented` labels describe individual surfaces only. Update status only when the corresponding tests and evidence exist.
