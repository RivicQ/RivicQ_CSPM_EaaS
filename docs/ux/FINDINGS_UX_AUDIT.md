# Findings UX audit

Route: `/findings`. Source: `GET /api/v1/scans/findings` (`source: cbom_scans`).

Investigation layout: table + Why / Evidence / Impact / Recommendation. Secret values are not rendered.

Filters persist in the URL (`severity`, `q`, `id`). Saved views are browser-local.

Bulk: CSV export of the current view. Assign / suppress / SLA are not Community APIs — UI states that instead of pretending.
