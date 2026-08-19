# RivicQ web application

React (Create React App) console for **Community (Apache-2.0)** and **Enterprise** editions.

Live static build: https://rivicq.github.io/RivicQ_CSPM_EaaS/

## Visual language

The UI follows a **quiet dusty violet** in the rivicq.com family — not IBM Carbon, not neon:

| Token | Hex | Role |
|-------|-----|------|
| Dusty violet | `#5a5268` | Interactive / primary |
| Dusty violet mid | `#6b6278` | Hover / secondary |
| Charcoal | `#1c1b1f` | Command surfaces |
| Ink | `#141316` | Sidebar / deep |
| Muted gold | `#a08a48` | Occasional highlight |

Type: **Outfit** + **JetBrains Mono**.

**IBM, IBM Plex, and Carbon are trademarks of IBM. RivicQ is not an IBM product. Control mappings are not certifications.**

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
