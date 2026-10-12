# Web and Repository Scraping / Crawling Policy

RivicQ CSPM performs outbound network access and repository content retrieval as a core part of scanning. This document is the policy for respectful, legal, minimal scraping and crawling, and it maps each rule to the code that enforces it.

## 1. Principles

1. **Only scan what the operator asked to scan** — every target goes through `TargetPolicy.ValidateTarget` before any socket or file access (`internal/discovery/target_policy.go`).
2. **Never exfiltrate secrets** — evidence is minimized; secret values are never rendered in the UI, Graph demo, or Gitleaks output.
3. **Respect site control signals** — honor rate limits, identify our user agent, and do not circumvent technical access controls.
4. **Minimize footprint** — read a bounded amount of data, one request per target for web checks, no background crawling of third parties.
5. **Authenticated data stays authorized** — GitHub token and customer cloud credentials are used only against repos/projects owned or authorized by the operator.

## 2. robots.txt and Terms of Service

- The built-in HTTP scanner performs a **single GET** of the target root (`/?data=test`) and reads **at most 1024 bytes** (`internal/discovery/http_scanner.go:64`). It does not follow links, does not crawl a site graph, and does not fetch subpages, so it has no crawl queue to throttle against robots.txt.
- Operators who need deeper web scraping must implement it within authorization boundaries and should run it from their own environments; the shipped engine intentionally does not crawl.
- For GitHub content scanning, repository access is governed by the GitHub API and the operator's `GITHUB_TOKEN` scope. Only tokens the user supplies are used; the API surface does not scan other users' private repositories.

## 3. Rate limits and courtesy

| Surface | Limit | Enforcement |
|---|---|---|
| API requests per client | 100 req/min (OSS), 1000 req/min (Enterprise), per IP | `internal/middleware/ratelimit.go`, `Retry-After: 60` header |
| Webhook-triggered scans | max 4 concurrent scans | `webhookScanConcurrency` (`internal/api/shared/github_scanning.go:400`) |
| GitHub tree files per repo | 40 (80 with `deep_scan`) | `scanGitHubRepo` cap |
| GitHub file content | 512 KiB | `githubFileContent` truncation |
| Webhook body | 8 MiB | `DefaultWebhookBodyBytes` |
| Firmware/identity artifact | hard size caps | `internal/firmware/limits.go` |
| External tools (Syft/Trivy/Grype/Gitleaks/OSV) | local directory scans only | `internal/intelligence/adapters_external.go`, `RIVICQ_EXTERNAL_TOOLS=0` disables |

## 4. User-Agent

- HTTP scanner identifies itself as `RivicQ-CryptoBOM-Scanner/1.0` (`internal/discovery/http_scanner.go:68`).
- GitHub API requests are authenticated (`Authorization: Bearer`) and set `Accept: application/vnd.github+json` and `X-GitHub-Api-Version: 2022-11-28`.
- Operators running the CLI are expected to set a real contact email in repository metadata where required by third-party terms.

## 5. Data minimization

- Web checks: one response body limited to 1 KiB, response headers only.
- GitHub scans: only "interesting" paths (`isInterestingPath`) are fetched; tree listing is capped.
- Gitleaks emits finding metadata, never secret values.
- Firmware/identity analysis is metadata-only: no execution, no flash reads, no SIM/SE/subscriber secret extraction (`docs/KNOWN_LIMITATIONS.md`).
- Scan results carry provenance (`commit_sha`, `default_branch`, `scanner_version`) but not raw page bodies.

## 6. Caching

- Scan results are held in the in-memory store (`internal/api/shared/events.go` delivery cache, `delivery_cache.go`) for webhook replay protection (30-minute TTL) and for scan-status polling.
- No third-party page content is republished or cached; `fabric/` renders synthetic data, and HTTP responses are not stored for later serving.
- `cache-control: no-store` is set on API responses (`internal/middleware/security.go`).

## 7. Prohibited sources and behaviors

Prohibited in the shipped scanner (enforced by `internal/discovery/target_policy.go`):

- Private / loopback / link-local / multicast / CGNAT / documentation / reserved / NAT64 networks unless the operator explicitly sets `RIVICQ_SCAN_ALLOW_PRIVATE_NETS=true`.
- Cloud metadata endpoints: `169.254.169.254`, `metadata.google.internal`, `metadata.goog`, `instance-data.ec2.internal`, `100.100.100.200`.
- Internal hostnames (`*.internal`, `*.local`).
- Non-allow-listed ports (only `80,443,22,2222,8443,4433,4443,9443,8080,8000,5000,9000,8081,8082`).
- Local filesystem reads outside `RIVICQ_SCAN_LOCAL_PATH_ROOTS` (local scanning is off by default).
- Scan targets that resolve to any non-globally-routable address; hostnames are resolved once and re-checked at connect time (`safe_dial.go`).

Also prohibited:

- Circumventing paywalls, authentication systems, or anti-bot defenses to obtain content.
- Harvesting personal data; scanning third-party estates without authorization.
- Replaying captured webhook bodies (rejected as `duplicate_delivery`, `github_webhook_security_test.go`).

## 8. Related documents

- `docs/DATA_SOURCE.md` — where data comes from, provenance, licensing.
- `PRIVACY.md` — personal data handling.
- `SECURITY.md` — responsible disclosure for scanner behavior.
- `docs/INTEGRATIONS.md` — optional third-party scanners and their trust boundaries.