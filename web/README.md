# RivicQ web application

React (Create React App) console for **Community (Apache-2.0)** and **Enterprise** editions.

Live static build: https://rivicq.github.io/RivicQ_CSPM_EaaS/

## Visual language

The UI follows **IBM Carbon** color tokens and **IBM Plex Sans / Plex Mono**:

| Token | Hex | Role |
|-------|-----|------|
| Blue 60 | `#0f62fe` | Interactive / primary |
| Blue 70 | `#0043ce` | Primary hover / brand dark |
| Gray 100 | `#161616` | Command sidebar / dark surfaces |
| Gray 10 | `#f4f4f4` | Light canvas |
| Green 50 | `#24a148` | Success / healthy |
| Red 60 | `#da1e28` | Critical |

RivicQ is **not** an IBM product. See [TRADEMARKS.md](../TRADEMARKS.md).

Tokens live in `src/theme/tokens.ts`. Theme assembly: `src/theme/theme.ts`.

## Scripts

```bash
cd web
npm ci
npm start          # webpack dev server (homepage /RivicQ_CSPM_EaaS/)
CI=true npm test -- --watchAll=false
CI=true npm run build
npx tsc --noEmit
```

`CI=true npm run build` fails on ESLint warnings.

## Editions

Edition selection is a workspace flag (`src/config/editions.ts`), not a second codebase. Community users must not see unlabeled simulated enterprise estates. Demo trail sets a client marker `rivicq-demo-session` (not a JWT).

## Environment

See `../.env.example` and [docs/DEPLOY_ENV.md](../docs/DEPLOY_ENV.md). Pages builds inject public Supabase keys for optional sign-in; there is still **no** RivicQ scan API on GitHub Pages.

## License

Community UI source is Apache-2.0 with the rest of this repository. Enterprise-only screens remain part of the commercial entitlement described in [LEGAL.md](../LEGAL.md).
