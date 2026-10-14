# UI route matrix

Source of truth for tests: `web/src/ops/routeMatrix.ts` (must stay aligned with `web/src/App.tsx`).
Ops IA: `web/src/ops/navigation.ts`.

Verified by `web/src/ops/routeMatrix.test.ts` (this session, PASS).

## Core workflows

| Workflow | Route | Backend needed | Notes |
|----------|-------|----------------|-------|
| Auth | `/login` `/register` `/forgot-password` `/reset-password` | API | Pages without `REACT_APP_API_URL` cannot complete a real login |
| Start scan | `/scanner` | API | Demo session is labeled, not a JWT |
| Findings / evidence | `/findings` | API | Fields include presence/PQC when the API is this branch's engine |
| CBOM | `/bom` | API | Unified view; Enterprise layers 403 on Community |
| Risk / PQC | `/migration` `/cspm` | API | No automatic key rotation control |
| Export | `/analytics` | API | `web/src/utils/reportExport.ts` |
| History / failures | `/scanner` | API | |
| Graph | (not in App.tsx) | n/a | RivicQ Graph is the separate `fabric/` app |

Enterprise cloud/HSM/AIBOM routes are gated (`RequireEnterprise`). Without credentials the pages must show empty/unavailable — they must not fabricate live metrics.

**Not verified in a browser this session.**
