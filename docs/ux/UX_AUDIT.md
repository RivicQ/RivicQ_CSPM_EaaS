# UX audit — RivicQ CSPM console

Date: 9 Sep 2026. Scope: `web/` Community console + Enterprise-gated routes. Honesty rules: no invented CVEs, scores, or certifications. GitHub Pages is static.

## What this audit is for

Optimize for a security team completing:

onboard → connect → discover → scan → inventory → CBOM → analyze → risk → quantum readiness → PQC → policy → finding → evidence → remediate → verify → compliance mapping → report → audit.

Not for screenshots.

## Current stage

**Commercial MVP / Production candidate for Community scanning.** Not Enterprise Grade. The engine (scan, CBOM, policy gate, Qiskit taxonomy) is real. The console was a module catalog plus a dashboard that mixed simulation. This change set adds an operator IA, a real findings queue, command palette, and stops several fake-progress / fake-metric paths.

## UX/UI score (100)

| Area | Weight | Score | Notes |
|------|--------|------:|-------|
| Information architecture | 10 | 7 | Operations / Posture / Integrations / Enterprise. Demo is not primary nav. |
| Enterprise dashboard | 10 | 6 | Inbox + KPI drill to findings. Still uses simulation when live telemetry is absent (labeled). |
| Asset UX | 8 | 6 | Table + detail. No server pagination. |
| Findings UX | 10 | 7 | New `/findings` from `GET /scans/findings`. Evidence panel. No backend assign/suppress. |
| CBOM UX | 8 | 5 | Unified counts + simple explorer list. Not a relationship graph. |
| PQC migration UX | 10 | 5 | Scan intelligence roadmap. No effort estimates (unavailable). |
| Compliance UX | 7 | 4 | Mappings, not certifications. Evidence drill is thin. |
| Scan UX | 7 | 7 | Honest progress (indeterminate unless API percent). Failed jobs show API error. Schedules not faked. |
| Integration UX | 5 | 5 | PATH scanners real; cloud connect is Enterprise + credentials. |
| Administration UX | 5 | 4 | Users/audit/keys exist. SSO store only. |
| Reporting UX | 5 | 3 | Analytics tabs; export on assets/findings is local. No report builder. |
| Design system | 5 | 6 | Tokens + PageFrame + EmptyState. Not a full primitive catalog. |
| Accessibility | 5 | 5 | Focus-visible, labels on status/search. Not a WCAG 2.2 AA certification. |
| Performance | 5 | 5 | Client tables capped. Do not load 100k findings. |

**UX/UI readiness: 68 / 100 — Functional product.**

## REAL vs MOCK vs PLACEHOLDER (production console)

| Surface | Verdict |
|---------|---------|
| CBOM scans, findings, assets from API | REAL when backend up |
| `GET /intelligence/tools` PATH probe | REAL |
| Dashboard simulation when no telemetry | MOCK, labeled DEMO |
| Security modules KPIs | PLACEHOLDER / seeded |
| Notification badge | REAL count of failed scans + critical findings (0 if none) |
| Scan percent without API progress | PLACEHOLDER removed — indeterminate |
| Asset compliance default 75 | PLACEHOLDER removed |
| Scheduled scans Pause/Enable | MOCK removed — empty + explanation |
| Command palette / search | REAL over nav + loaded findings/scans/assets |
| Bulk assign findings | UNAVAILABLE (not faked) |

## P0 remaining

- Do not treat edition switcher as a license grant.
- Pages cannot run live workflows.
- Finding workflow (assign, suppress, SLA) needs control-plane APIs.

## P1 remaining

- SSO ACS login, mailbox reset, scheduled scans, live cloud attach.
- Server-side findings pagination.
- Report builder with preview.

## P2

- CBOM graph, column pinning, shared saved views, email notifications.

See also: [UX_GAP_MATRIX.md](UX_GAP_MATRIX.md), [UX_IMPLEMENTATION_ROADMAP.md](UX_IMPLEMENTATION_ROADMAP.md).
