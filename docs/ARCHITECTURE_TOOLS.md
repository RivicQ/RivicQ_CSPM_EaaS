# Architecture tools (Archify and REA)

## Archify — found in-tree

`archify/` is a **static architecture/diagram site** checked into this repository:

- Specs: `archify/spec/*.json`
- Rendered diagrams: `archify/diagrams/*.html`
- Site: `archify/site/index.html`
- Pages publish copies it (see `docs/GITHUB_ACTIONS_AND_PAGES.md` / `.github/workflows/pages.yml`)

Receipt JSON under `archify/diagrams/` references a **local** generator (`/Users/re1/.agents/skills/archify/bin/archify.mjs`). That binary is **not** installed in this cloud environment and is not a Go/npm workspace package. This session did **not** regenerate diagrams.

Archify is not the Community API and not a design-token runtime for `web/`. The React console uses MUI + `web/src/theme/*`.

## REA — not found

A repository-wide search for a product/module named **REA** (Risk Exposure Analytics, or any `internal/rea` package) returned **no RivicQ module**. Hits were false positives (`REACT_APP_*`, “readiness”, etc.).

**Precise question for the owner:** What does “REA” refer to in RivicQ — a planned module name, an external tool, or an acronym we should map onto `internal/intelligence` / `internal/bom`? Until that is defined, this branch does not create a placeholder package.

## Decision

Do not invent an REA API. Keep Archify as a published static site. Engine architecture remains Go packages listed in `docs/ARCHITECTURE.md`.
