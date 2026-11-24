# Archify-inspired UI/UX alignment report

Date: 2026-11-23  
Branch: `feat/archify-parity-auth-workflows-beta-ux`  
Scope: `web/` public site, console shell, dashboard, CBOM/findings, architecture/workflow surfaces, auth/onboarding/billing surfaces, shared theme/tokens, and documentation.

## 1. Objective and boundaries

The work aligns the RivicQ web experience with the Archify reference (`https://archify.si/`) while preserving RivicQ identity and backend truthfulness.

Applied constraints:

- Dark and light themes are both supported; dark is the default console experience.
- The global footer carries `© 2026 RivicQ GmbH i.G. · hello@rivicq.com`.
- No new dependencies, no duplicate route/component/theme systems, and no new code comments.
- Real API behavior, auth, Stripe, permissions, CBOM workflows, generated Archify/static site CSS, and `archify/diagrams/*.html` remain unchanged.
- No sample data is presented as customer telemetry. Demo assets remain explicitly labelled.
- Product maturity remains expressed with the fixed labels `Production implemented`, `Beta implemented`, `Experimental`, `Integration pending`, `Planned`, and `Not supported`.
- Overall product status remains `PARTIALLY IMPLEMENTED — controlled pilot ready for static cryptographic inventory; production Enterprise remains BLOCKED BY EXTERNAL CONFIGURATION`.

## 2. Implemented UI/UX changes

### Shell, theme, and identity

- `web/src/theme/ThemeContext.tsx` owns dark/light mode through `mode`, `setMode`, and `toggleMode`.
- Theme selection persists in `localStorage` under `rivicq.theme.mode`; first visit respects `prefers-color-scheme` and otherwise defaults to dark.
- The provider sets `document.documentElement.dataset.theme` and `style.colorScheme`, allowing shared CSS variables to drive both MUI and non-MUI surfaces.
- `web/src/App.tsx` wraps all providers below `ThemeModeProvider`; MUI theme selection follows `useThemeMode()`.
- `web/src/components/ThemeToggle.tsx` is the shared header switcher with an accessible label (`Switch to light theme` / `Switch to dark theme`).
- `web/src/components/brand/CompanyFooter.tsx` is the shared global footer, with a compact variant for authenticated surfaces, and displays `RivicQ GmbH i.G.`.
- `web/src/components/TrademarkNotice.tsx` uses `RivicQ GmbH i.G. · cryptographic security platform. Control mappings are not certifications.`
- Public shell, auth chrome, marketing home, public static pages, and authenticated layout now share the same switcher/footer treatment.

### Information architecture and navigation

- `web/src/ops/navigation.ts` groups console routes into `Overview`, `Discovery`, `Intelligence`, `Reporting`, `Platform`, and `Enterprise`.
- Public `/contact` and `/ibm` entries are no longer presented as console navigation.
- Enterprise routes `/enterprise/ibmcloud`, `/enterprise/awscloud`, `/enterprise/quantum-attestation`, and `/modules` are reachable from the rendered Enterprise navigation.
- Settings and Administration are explicit rendered routes; `/demo` is shown only for demo sessions.
- Breadcrumbs and titles now include section context and cover asset/module detail routes.
- `web/src/layouts/Layout.tsx` uses the grouped drawer, section labels, preserved plan/admin gating, mobile bottom navigation, theme switcher, and global footer.

### Dashboard, CBOM, and findings

- Dashboard cards, strips, charts, queues, and panels use shared `--rvq-*` variables rather than component-local hardcoded dark colors.
- Inbox-first hierarchy is retained: findings and scans lead the overview; charts and posture summaries follow.
- Semantic headings, labelled controls, keyboard-accessible rows, ARIA labels, and mono typography for IDs/CVEs/hashes were added where appropriate.
- Assets and findings surfaces show explicit empty, loading, and error states without inventing results.
- Demo sessions state `Labeled demo inventory only. No customer assets are substituted or mixed in.`

### Architecture, workflow, auth, onboarding, and billing

- Archify maps, workflow studio, and embedded plates use compact, theme-aware surfaces; generated diagrams were not edited.
- Auth, reset, verification, beta request, onboarding, account, settings, pricing, and readiness surfaces use shared theme tokens and honest status copy.
- Failed login/registration paths show friendly errors and do not expose raw `Network Error` text.
- Registration confirmation states do not claim that email was sent when email delivery is not configured.
- Pricing and enterprise surfaces preserve entitlement/status boundaries instead of implying live provisioning.

## 3. Verification evidence

Web verification was run from `/Users/re1/re1/CSPM/web`:

```bash
npm run type-check
npm run lint
CI=true npm test -- --watchAll=false --coverage=false
npm run build
```

Result: all commands passed.

- Test suites: 36 passed, 36 total.
- Tests: 126 passed, 126 total.
- Production build: compiled successfully for the configured `/RivicQ_CSPM_EaaS/` homepage.
- Known non-failing warnings: `ReactDOMTestUtils.act` deprecation, React Router v6 future-flag warnings, and stale Browserslist data.
- Final web output: `/Users/re1/.local/share/opencode/tool-output/tool_20a1c5611001FPqrFclFdMI6EM`.

Go verification was run from `/Users/re1/re1/CSPM`:

```bash
go build ./...
go test ./...
go vet ./...
gofmt -l .
git diff --check
```

Result: all commands passed; `gofmt -l .` reported no files.

Two frontend tests (`web/src/pages/BetaSignup.test.tsx` and `web/src/pages/AuthPage.network.test.tsx`) passed in isolation but timed out once under full parallel-suite load. Their explicit Jest timeouts were raised from the default/15s to 30s; the complete rerun then passed.

## 4. Screenshot status

Screenshots were **not captured** in this environment. No local browser binary or browser-automation package was available (`chromium`, `chromium-browser`, `google-chrome`, `playwright`, `puppeteer`, or Node automation packages). The required visual review at `1920 × 1080`, `1600 × 900`, `1440 × 900`, `1366 × 768`, tablet, and mobile remains manual and pending. The production build and DOM-level tests pass, but they are not a substitute for browser review.

## 5. Changed files

Modified:

- `web/src/App.tsx`
- `web/src/components/TrademarkNotice.tsx`
- `web/src/components/brand/ArchifyWorkflowEmbed.tsx`
- `web/src/components/brand/AuthChrome.tsx`
- `web/src/components/brand/PublicShell.tsx`
- `web/src/components/dashboard/ComplianceScoreGrid.tsx`
- `web/src/components/dashboard/CspmCapabilityStrip.tsx`
- `web/src/components/dashboard/DashboardDrilldown.tsx`
- `web/src/components/dashboard/DashboardPanel.tsx`
- `web/src/components/dashboard/DomainOpsStrip.tsx`
- `web/src/components/dashboard/FindingsSeverityBar.tsx`
- `web/src/components/dashboard/InboxHero.tsx`
- `web/src/components/dashboard/PQCReadinessPanel.tsx`
- `web/src/components/dashboard/PostureTrendChart.tsx`
- `web/src/components/dashboard/QuickActionsGrid.tsx`
- `web/src/components/dashboard/RiskHeatmap.tsx`
- `web/src/components/dashboard/ScanActivityTimeline.tsx`
- `web/src/components/dashboard/SecurityFeedItem.tsx`
- `web/src/components/dashboard/StatCard.tsx`
- `web/src/components/dashboard/ThreatIntelStrip.tsx`
- `web/src/components/dashboard/TopFindingsList.tsx`
- `web/src/layouts/Layout.consoleShell.test.tsx`
- `web/src/layouts/Layout.tsx`
- `web/src/ops/navigation.test.ts`
- `web/src/ops/navigation.ts`
- `web/src/pages/AccountCenter.tsx`
- `web/src/pages/ArchifyMaps.tsx`
- `web/src/pages/AssetDetails.tsx`
- `web/src/pages/Assets.tsx`
- `web/src/pages/AuthPage.network.test.tsx`
- `web/src/pages/AuthPage.tsx`
- `web/src/pages/BetaSignup.test.tsx`
- `web/src/pages/BetaSignup.tsx`
- `web/src/pages/BomIntelligence.tsx`
- `web/src/pages/ClientOnboarding.tsx`
- `web/src/pages/Dashboard.tsx`
- `web/src/pages/Findings.tsx`
- `web/src/pages/ForgotPassword.tsx`
- `web/src/pages/Home.scanFallback.test.tsx`
- `web/src/pages/Home.tsx`
- `web/src/pages/Pricing.tsx`
- `web/src/pages/ProductionReadiness.tsx`
- `web/src/pages/ResetPassword.tsx`
- `web/src/pages/Scanner.tsx`
- `web/src/pages/Settings.tsx`
- `web/src/pages/SitePage.tsx`
- `web/src/pages/VerifyEmail.tsx`
- `web/src/pages/WorkflowStudioConsole.tsx`
- `web/src/pages/WorkflowStudioPage.tsx`
- `web/src/theme/ThemeContext.tsx`

Added:

- `web/src/components/ThemeToggle.tsx`
- `web/src/components/brand/CompanyFooter.tsx`
- `web/src/components/dashboard/InboxHero.test.tsx`
- `web/src/pages/Pricing.test.tsx`
- `web/src/theme/ThemeContext.test.tsx`

Documentation updated by this change set:

- `docs/UI.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/TESTING.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/UX_DESIGN.md`
- `docs/PRODUCT_IMPROVEMENT_PLAN.md`
- `docs/UX_REDESIGN_REPORT.md`

## 6. Remaining issues

1. Browser screenshots and responsive review at the required viewports are still pending.
2. Screenshot regression tooling and pixel-level responsive checks remain `Planned`.
3. External integrations remain unconfigured/unverified: hosted DB/RLS, email delivery, OAuth provider config, Stripe/checkout, cloud credentials, IBM Quantum/HPCS credentials, HSM/QKD/QRNG hardware, and wireless operations.
4. `npm run format:check` still fails on pre-existing repository-wide Prettier/quote-style mismatches; no mass reformat was performed.
5. React `act` deprecation and React Router future-flag warnings remain in test output; they do not fail the suite.
6. GitHub Pages remains a labelled static demo without a live engine unless `REACT_APP_API_URL` is configured to a deployed API.
7. PR submission remains manual because `gh` is unavailable and `GITHUB_TOKEN`/`GH_TOKEN` are unset.
