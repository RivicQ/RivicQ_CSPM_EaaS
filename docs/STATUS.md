# RivicQ CryptoBOM — live outcome (16 Aug 2026)

Public Community app: **https://rivicq.github.io/RivicQ_CSPM_EaaS/**

Pull request: **https://github.com/RivicQ/RivicQ_CSPM_EaaS/pull/49**

## What clients can do now

1. Open the GitHub Pages site (Community edition).
2. Paste a **public GitHub repository URL** on the homepage and run a CBOM scan. Pages has no Go API, so the browser analyzes the public tree (algorithms, key sizes, quantum flag, BSI / DORA / eIDAS mapping). Findings are never fabricated.
3. Export the report as JSON or a simple PDF.
4. Sign in (Supabase), use an empty Community workspace until a real engine scan exists, request Enterprise via `/beta`, and send in-app feedback.

## What this branch fixed

| Area | Outcome |
| --- | --- |
| Frontend CI | ESLint/build green (`SecurityFeedItem` unused hook, Dashboard memo deps). |
| Go lint | `golangci-lint` v2.4 (action v8) so lint matches Go 1.25. |
| Integration / production CI | Servers built before health checks; Postgres `sslmode=disable`; edition check is case-insensitive. |
| Container SBOM | `anchore/sbom-action` (the old `syft-action` repo does not exist). |
| Docs job | Builds `web/` after `npm ci` instead of an empty `docs/` npm tree. |
| CodeQL Advanced | Skipped while GitHub **default** CodeQL setup is enabled (advanced SARIF uploads were rejected). |
| GitHub Pages | This branch also triggers `Deploy GitHub Pages` so the public site updates before merge to `main`. |

## Honest limits

See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md). Private repos, containers, and live TLS still need a local or self-hosted engine.
