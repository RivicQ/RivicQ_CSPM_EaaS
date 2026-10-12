# User Interface: Information Architecture and Components

The RivicQ web console lives in `web/` (React 18 + TypeScript + MUI 5 + react-router 6 + TanStack Query). Design tokens, typography, and color semantics are specified in `docs/DESIGN_SYSTEM.md` and `docs/UX_DESIGN.md`; this document covers the application structure, routing, data flow, and edition gating that the UI implements.

## 1. App shell and routing

`web/src/App.tsx` drives the app shell:

- **Code splitting**: pages load via `React.lazy` (`const Home = React.lazy(() => import('./pages/Home'));`) with Suspense fallback and error boundary — the dashboard shell stays interactive while heavy routes resolve.
- **Providers**: `ThemeModeProvider` (light/dark, respects `prefers-color-scheme`, system default; toggle in `web/src/components/ThemeToggle.tsx`), `QueryClientProvider` (staleTime 60_000ms, gcTime 5 minutes), `RouterProvider`, `AuthProvider`.
- **Layout**: `AppBar` (RivicQ mark `web/public/brand/rivicq-mark.svg`, editions menu, API base URL panel, theme toggle), `Container` maxWidth lg, boxed dashboard surfaces, `Footer` on marketing pages.
- **Protected routes**: `RequireAuth` (redirects to `/login` with `state.from`), `RequireEnterprise` (404/upgrade screen when the edition is community), `RequireRole` for operator/admin pages (`web/src/components/RequireRole.tsx`).

Route map (community edition unless noted):

| Path | Page | Auth | Edition |
|---|---|---|---|
| `/` | Marketing home | public | both |
| `/login`, `/register`, `/reset-password` | Auth flows | public | both |
| `/dashboard` | Dashboard (stats, alerts, BOM form) | auth | both |
| `/scan` | Run a scan + live progress | auth | both |
| `/scan-history` | History, scan detail | auth | both |
| `/sbom` / `/cyclonedx` | BOM/CycloneDX views | auth | both |
| `/vulnerabilities` / `/findings` | Findings lists, evidence | auth | both |
| `/crypto-art` | Crypto artifact explorer | auth | both |
| `/policies` | Policy editor (managed, warn/block) | auth | both |
| `/integrations` | GitHub, CI/CD wiring | auth | both |
| `/settings` | Profile, session, API key, webhooks, SSO | auth | both (key/webhook/SSO admin-only) |
| `/admin/*` | API keys, webhooks, audit, users | admin | enterprise |
| `/enterprise/*` | SSO, compliance packs, cloud, quantum | admin/roles | enterprise |
| `/graph` | RivicQ Graph (synthetic demo) | public/demo | separate fabric app |

## 2. Data flow

- All API calls go through `web/src/services/api.ts` (axios instance, base URL from `web/src/config/editions.ts`, JSON content type, `Authorization` header from stored JWT if present, routes through `/api/v1`).
- `api.ts` and route-level hooks (e.g. `useScan`, `useReport`) use TanStack Query so polling and retries are centralized; optimistic updates avoid refetch storms.
- Auth state in `web/src/context/AuthContext.tsx` feeds `RequireAuth`, `RequireEnterprise`, and role dropdowns; `logout` clears tokens.
- Configured edition detection: `web/src/config/editions.ts` returns `OSS_PORT`/`ENTERPRISE_PORT` and API base URL; when `REACT_APP_EDITION=enterprise` is set, the SPA expects `/api/v1` on the served domain and a license-keyed backend. The public Pages build is `community`.
- Real-time scan progress: clients poll `GET /api/v1/scans/:id` and subscribe to SSE `/api/v1/scans/:id/stream` when the browser supports it; progress state is stored in zustand (declared in `web/package.json`) or a Query cache per-page.
- Optional Supabase presence (`web/src/services/supabase.ts`) is used only when both `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_PUBLISHABLE_KEY` are provided; with neither, the app never phones home.

## 3. Page responsibilities

| Page | Keys | Dynamic |
|---|---|---|
| `Home` | Marketing + hero + LIVE scan builder | shows `editions` `features` from `/edition`, formatted by `web/src/utils/format.ts` |
| `Scan` | Target input (domain/repo/asset), `POST /scans`, then poll | renders live `crypto_assets` table as results stream in |
| `Dashboard` | Stats/trend/severity via `web/src/data/*` | computes `percentages` for severity donut; no emoji, severity colors follow crypto-severity only (`tokens.ts`) |
| `Vulnerabilities/FindingDetail` | Finding list + evidence modal | uses `web/src/components/Finder.tsx` (selectize + search) |
| `CryptoArt` | `wizard`, `Search` from `web/src/demo/` | edition-aware placeholder (future tenant data) |
| `Settings` | Tabs (profile, sessions, API key, webhooks, SSO) | enterprise gates via `RequireRole('admin')` |
| `Audit` | `/audit`, search + export | Enterprise; admin reader |

## 4. Component inventory (top-level)

`web/src/components/`: `AppBar.tsx`, `AuthRoute.tsx`, `CodeBlock.tsx`, `CopyBox.tsx`, `CustomPageLayout.tsx`, `EmptyState.tsx`, `Finder.tsx`, `FindingCard.tsx`, `FramedCodeView.tsx`, `LiveRebuildBanner.tsx`, `MarkdownRenderer.tsx`, `MetricsCard.tsx`, `MonacoModule.tsx` (Monaco editor lazy-load), `PieChartCard.tsx`, `Pill.tsx`, `ReadOnlyModal.tsx`, `RecentDatasets.tsx`, `RecentReports.tsx`, `ReportCard.tsx`, `RequireEnterprise.tsx`, `RequireRole.tsx`, `ScanControls.tsx`, `ScanResult.tsx`, `SearchInput.tsx`, `StatusChip.tsx`, `TableState.tsx`, `ThemeToggle.tsx`, `Toasts.tsx`, `VisualFilter.tsx`.

## 5. States and errors

- Loading: MUI `LinearProgress` banners and skeleton `TableState`; query retries silent behind the scenes.
- Empty: `EmptyState` with a guiding CTA (e.g. "Run your first scan") — no fabricated data.
- Error: `toast` container + inline alert; `Monaco`/charts degrade rather than crash; `ErrorBoundary` route fallback shows reset actions.
- Demo banner: `LiveRebuildBanner` and `DemoMode` pills mark synthetic Graph/demo data so it is never mistaken for a real estate.
- Form validation on target input (URL/regex) with helper text before submit; webhook preserves input for retry.

## 6. Design constraints carried into the UI

- No emojis in UI copy; pill/status icons from `@mui/icons-material` only (`docs/DESIGN_SYSTEM.md` design rule 1).
- No certification claims in the UI — compliance pack badges say "mapping" language, not certified language.
- Fonts: Inter + JetBrains Mono via `theme/typography.ts`; radii 8/12/16/9999; glow shadows reserved for the dark nebula theme.
- Respect `prefers-reduced-motion` (framer-motion guards in `theme/dashboardDesign.ts`).
- Every page keeps at most one H1 for heading hierarchy and accessibility.