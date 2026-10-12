# Cloudflare Pages

RivicQ publishes the same static artifact to **GitHub Pages** (`pages.yml`) and
**Cloudflare Pages** (`cloudflare-pages.yml`) in parallel. Cloudflare adds edge
WAF/rate-limiting, managed TLS, and a place to apply strict security headers.

Nothing about the GitHub Pages deploy changes; Cloudflare is additive and can be
removed by deleting one workflow.

## Artifact

Both hosts serve the output of `scripts/build-pages.sh`, which produces the
composite site in `web/build/` (app at `/`, plus `/api/`, `/fabric/`, `/docs/`,
`/marketing/`, `/media/`, `/archify/`, `/nexus/`).

## Host configuration

| File | Purpose |
|------|---------|
| `cloudflare/_headers` | Security headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) + cache policy. Copied to `web/build/_headers`. |
| `cloudflare/_redirects` | Strips the GitHub Pages base path `/RivicQ_CSPM_EaaS/` (rewrite, not redirect) and provides the SPA fallback. Copied to `web/build/_redirects`. |
| `wrangler.toml` | Pages project name (`rivicq-cspm`) and output dir (`web/build`). |

## Setup (one time)

1. Create the project:
   ```bash
   npx wrangler pages project create rivicq-cspm
   ```
2. Add repository secrets (Settings -> Secrets and variables -> Actions):
   - `CLOUDFLARE_API_TOKEN` — token scoped to **Cloudflare Pages: Edit**.
   - `CLOUDFLARE_ACCOUNT_ID` — from the Cloudflare dashboard.
3. Push to `master`/`main` (or run the `Deploy Cloudflare Pages` workflow
   manually). Until the token secret exists the workflow runs the build only and
   skips the deploy, so it never fails CI.

The output is served at `https://rivicq-cspm.pages.dev`. Add a custom domain in
the Cloudflare dashboard (Pages project -> Custom domains).

## Base-path note

The committed build targets GitHub Pages under `/RivicQ_CSPM_EaaS/` (CRA
`homepage` + router/fabric basenames). Cloudflare serves the site at its root, so
`_redirects` strips that prefix with an internal rewrite:

```
/RivicQ_CSPM_EaaS/*  /:splat  200
/*                   /index.html  200
```

This keeps a single artifact for both hosts. If you later host only on
Cloudflare behind a custom domain and prefer literal root URLs, build with
`homepage: "/"` (and matching router basenames) instead and drop the strip rule.

## Recommended hardening

- Enable **WAF Managed Rules** and a **rate-limiting rule** on `/api/*` and the
  login endpoints at the Cloudflare zone level.
- Enable **Bot Fight Mode** or Super Bot Fight Mode.
- Keep TLS mode **Full (strict)**; the `_headers` file sets HSTS.
- Start the CSP in **Report-Only** (via a Transform Rule) before enforcing, since
  the app loads Google Fonts and connects to Supabase/PostHog/Stripe.

## Removing Cloudflare

Delete `.github/workflows/cloudflare-pages.yml` and the `cloudflare/` directory;
`scripts/build-pages.sh` will simply stop copying the host config. GitHub Pages
is unaffected.
