# UI audit (this session)

Method: static review of `web/src/App.tsx`, `web/src/ops/navigation.ts`, `web/src/theme/*`, `web/src/components/dashboard/LiveScanMetrics.tsx`. No GUI browser run.

## Brand

Purple-and-dark nebula (`#7C3AED` on black) via `web/src/theme/designSystem.ts` / MUI. Light mode remains available (`rivicq.theme`).

## What holds

- Routes are code-split and wrapped in error boundaries.
- `RequireAuth` / `RequireEnterprise` / `RequireRole` exist.
- `LiveScanMetrics` is a **presentational** component: it renders `metrics` passed in; it does not invent numbers by itself. Callers must not feed hardcoded “live” counts when the API is down (`PublicEngineNotice` exists for that).
- Demo trail is explicit (`DemoTrailProvider`, `/demo`).

## Gaps (not fixed here — out of engine scope / no browser)

- Most pages have **0%** unit coverage.
- No Playwright/Cypress tree.
- Graph is a separate app (`fabric/`), not a console route.
- Enterprise connector pages can look “full” in demo edition; operators must treat demo banners as binding.

See `docs/ux/README.md` for the longer historical UX audits.
