# Code Style

Conventions for the Go backend and the TypeScript/React frontend. Match the
surrounding code first; when in doubt, follow this guide. Style that CI enforces
(`gofmt`, `go vet`, `tsc`, `golangci-lint`) is mandatory, not advisory.

## Contents

- [General](#general)
- [Go](#go)
  - [Formatting and lint](#formatting-and-lint)
  - [Package layout](#package-layout)
  - [Naming](#naming)
  - [Error handling](#error-handling)
  - [Context propagation](#context-propagation)
  - [Tests](#tests)
- [TypeScript and React](#typescript-and-react)
  - [TypeScript strictness](#typescript-strictness)
  - [Styling with MUI](#styling-with-mui)
  - [Component structure](#component-structure)
  - [Lint and format](#lint-and-format)
- [No emojis](#no-emojis)
- [Commit messages](#commit-messages)

## General

- Prefer clarity over cleverness. A boring, obvious implementation is the goal.
- Do not add comments that restate the code. Comments should explain *why*,
  especially a non-obvious constraint or a security decision.
- Do not invent features, providers, or APIs that do not exist (see the "Honesty"
  section of `.github/pull_request_template.md`).
- Keep changes small and reviewable.

## Go

Module path: `github.com/rivic-q/cryptobom-saas`. Go version is pinned in
`go.mod` (toolchain `go1.26.9`).

### Formatting and lint

Run before every commit:

```
gofmt -w $(git ls-files '*.go')
go vet ./...
go vet -tags enterprise ./...
golangci-lint run ./...
```

CI enforces the same:

- `gofmt -l` must be empty (`.github/workflows/ci.yml`); an unformatted file
  fails the build.
- `go vet ./...` and `go vet -tags enterprise ./...`.
- `golangci-lint` v2.4.0 with `errcheck`, `govet`, `ineffassign`, `staticcheck`,
  `unused` (`.golangci.yml`). `web/node_modules`, `fabric/node_modules`,
  `fixtures`, and `testdata` are excluded.

### Package layout

- `cmd/<binary>/` — one `main` package per binary: `cmd/server/oss`,
  `cmd/server/enterprise` (`-tags enterprise`), `cmd/rivicq`, `cmd/scanner`,
  `cmd/demo-scanner`.
- `internal/` — private application packages, grouped by domain:
  `auth`, `authn`, `database`, `middleware`, `tenant`, `edition`, `config`,
  `server`, `api/oss`, `api/enterprise`, `api/shared`, `discovery`, `firmware`,
  `identity`, `intelligence`, `compliance`, `controls`, `bom`, `platform`.
- `internal/api/shared` holds handlers used by both editions.
- Do not add code to `web/node_modules`-adjacent trees; the frontend lives in
  `web/`.
- Keep new packages inside `internal/` unless they are genuinely public.

### Naming

- Packages: short, lowercase, single word (`tenant`, `middleware`, `authn`).
- Exported identifiers: `CamelCase`; unexported: `camelCase`.
- Acronyms stay upper-case in the middle of an identifier: `TenantID`, `UserID`,
  `APIKey`, `URL`.
- Initialisms: `HTTP`, `JWT`, `SSE`, `RBAC`.
- Receivers are short and consistent (`func (s *Service)`, `func (q *Queries)`).
- Avoid stutter: `tenant.Resolve`, not `tenant.TenantResolve`.
- Test helpers end in `_test.go` and use `t.Helper()`.

### Error handling

- Wrap with context using `%w` so `errors.Is`/`errors.As` still work:
  `fmt.Errorf("cannot open database: %w", err)` (`internal/database/database.go`).
- Define sentinel errors for conditions callers branch on
  (`internal/authn/authn.go`: `ErrInvalidCredentials`, `ErrEmailTaken`, ...).
- Compare with `errors.Is` and extract with `errors.As` (e.g. the `pq.Error`
  unique-violation check in `internal/authn/store_sql.go`).
- Do not swallow errors silently. `errcheck` fails the build on an unchecked
  error; when ignoring one deliberately, assign to `_` with a reason.
- Return stable, user-facing messages to clients; log the underlying error with
  the `request_id` instead (`docs/SECURITY_GUIDE.md`, error redaction).

### Context propagation

- The first parameter of any I/O function is `ctx context.Context`
  (see the `UserRepository`/`SessionRepository` interfaces in
  `internal/authn/store.go`).
- Use `ExecContext` / `QueryContext` / `QueryRowContext`, never the non-context
  variants, in request paths.
- Thread the request context through handler → service → store; do not create a
  new `context.Background()` mid-request except at process boundaries and in
  shutdown paths.

### Tests

- Tests live next to the code as `*_test.go`.
- Use the standard library `testing`; property-style helpers are fine.
- Write from the untrusted-user perspective for anything touching auth, tenancy,
  or admin routes (`docs/SECURITY_GUIDE.md`, untrusted-user checklist;
  `internal/auth/*_test.go`, `internal/tenant/context_test.go`).
- Run `go test -race -count=1 ./...` (`make test`) or
  `go test -race -count=1 -short ./...` (`make test-unit`).

## TypeScript and React

The frontend is Create React App with TypeScript and MUI v5, located in `web/`
(see `web/package.json`, `web/tsconfig.json`).

### TypeScript strictness

- `strict: true` is enabled — no implicit `any`, no unchecked null.
- Keep `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`, and
  `isolatedModules` on.
- Type API responses and component props explicitly. Model shared types in
  `web/src/types` rather than inline `any`.
- Prefer `unknown` over `any` at boundaries, then narrow.
- Type-check with `npx tsc --noEmit` (`npm run type-check`). CI runs this.

### Styling with MUI

- Use MUI `sx` tokens and the theme, not hardcoded hex colors. The design tokens
  live under `web/src/theme` and `docs/DESIGN_SYSTEM.md`; the palette is built on
  a single violet axis (violet `#7C3AED`, surface `#0A0A0F`, canvas `#000000`).
- Reference theme values (`theme.palette.primary.main`, severity tokens) instead
  of literals. The repository deliberately replaced vendor hexes (e.g. IBM
  Carbon) with severity tokens.
- Reuse MUI components (`@mui/material`, `@mui/x-data-grid`, `@mui/x-charts`)
  rather than bespoke markup.
- Do not add hex colors, spacing, or font sizes outside the theme.

### Component structure

- One component per file; file name matches the component (`AuthPage.tsx`).
- Group by feature under `web/src/components`, `web/src/pages`, `web/src/services`,
  `web/src/hooks`, `web/src/context`.
- Keep data fetching in hooks/`services` (axios, React Query), not in
  presentational components.
- Never inject untrusted content with `dangerouslySetInnerHTML`
  (`docs/MASTER_RULES.md` rule 13).

### Lint and format

```
cd web
npm run lint          # eslint src --ext .ts,.tsx
npm run lint:fix
npm run type-check    # tsc --noEmit
npm run format:check  # prettier --check "src/**/*.{ts,tsx,json,css,scss}"
npm run format
```

- ESLint config extends `react-app` and `react-app/jest`
  (`web/package.json` → `eslintConfig`), plus `@typescript-eslint` and
  `eslint-plugin-react-hooks`.
- Prettier config: no semicolons, double quotes, `es5` trailing commas, 2-space
  indent, no tabs.
- `lint-staged` runs `eslint --fix` and `prettier --write` on staged files.

## No emojis

Do not use emojis in code, UI, comments, commit messages, or documentation.
Decorative icons are inline SVG/MUI icons, not emoji (see the commit history:
"replace emoji with inline SVG icons", "MUI tables, no emoji").

## Commit messages

Use Conventional Commits, matching the existing log:

```
<type>(<scope>): <imperative summary>
```

- **Types seen in this repo:** `feat`, `fix`, `refactor`, `docs`, `chore`, `ci`,
  `test`, `perf`, `build`, `style`.
- **Common scopes:** `auth`, `sec`/`security`, `db`, `api`, `ui`, `web`, `oss`,
  `core`, `ci`, `ops`, `theme`, `partners`, `docs`.
- Keep the summary imperative, lower-case, and focused on *why* when it is not
  obvious.
- Examples from this repository:

  ```
  feat(security): enforce authz, pin SSRF targets, and unblock the Pages deploy
  fix(security): trusted-proxy opt-in, CORS allowlist, audit query redaction
  fix(auth): enforce 12+ char bootstrap password with actionable startup error
  refactor(theme): unify design tokens to a single violet axis, drop gold aliases
  ci(codeql,snyk): install project Go toolchain for CodeQL; skip Snyk until token set
  docs(ops): runbook + dead-button UX fixes + fixed dev-stack
  ```

- One logical change per commit. Do not mix formatting-only churn with behavior
  changes.

## Related documents

- `docs/MASTER_RULES.md` — canonical rules.
- `docs/SECURITY_GUIDE.md` — secure coding specifics.
- `CONTRIBUTING.md` — contribution process.
- `.github/pull_request_template.md` — review checklist.
