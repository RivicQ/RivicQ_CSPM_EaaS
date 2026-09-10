# RivicQ web application

React (Create React App) console for **Community (Apache-2.0)** and **Enterprise** editions.

Live static build: https://rivicq.github.io/RivicQ_CSPM_EaaS/

## Visual language

**RivicQ nebula** — deep-space cryptographic SaaS (black canvas, violet glow):

| Token | Hex | Role |
|-------|-----|------|
| Canvas | `#000000` | Page background |
| Surface | `#0A0A0F` | Cards and chrome |
| Violet | `#7C3AED` | Primary buttons / glow |
| Violet deep | `#6D28D9` | Hover / pressed |
| Text | `#FFFFFF` | Headings and nav |
| Muted | `#D1D5DB` | Subheads and body |

Type: **Inter** + **JetBrains Mono**. Control mappings are not certifications. Pages is static — live quantum/PQC scores need the API or CLI.

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
