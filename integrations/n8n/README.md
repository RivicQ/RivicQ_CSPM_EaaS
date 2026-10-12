# n8n automation

Workflow automation triggered by scan completion and critical findings. These are
importable into an n8n instance and are **not** wired into the app; they consume
webhooks emitted by your automation layer (phase 5).

## Prerequisites

- A running n8n instance with API access.
- Credentials configured in n8n:
  - `n8n API` / instance credentials if using the API node
  - `Slack` (OAuth/API key) for notifications
  - `GitHub` (token) for issue creation
- Outbound calls from n8n must be allowed.

## Environment / credentials

| Credential | Purpose |
| --- | --- |
| `n8n webhook base URL` | e.g. `https://your-n8n.example/webhook` |
| `n8n API key` | only if workflows call n8n API |
| `SLACK_WEBHOOK_URL` or Slack OAuth | used by `alert-notify.json` (see Slack node) |
| `GITHUB_TOKEN` | for issue creation (HTTP Request node) |
| `GITHUB_REPO_OWNER` | e.g. `re1` |
| `GITHUB_REPO_NAME` | e.g. `CSPM` |

All are injected via n8n's Credentials; never stored in these JSON files.

## Webhooks

| Webhook path | Triggered when |
| --- | --- |
| `/webhook/scan-completed` | `scan.completed` event fires |
| `/webhook/finding-critical` | `finding.critical` event fires |

Payloads expected:

```json
{
  "scanId": "...",
  "tenantId": "...",
  "findingsCount": 5,
  "completedAt": 1759800000000
}
```

```json
{
  "findingId": "...",
  "tenantId": "...",
  "title": "...",
  "severity": "critical",
  "scanId": "...",
  "url": "https://..."
}
```

## Import

1. In n8n, open `Workflows → Import from file`.
2. Import `workflows/scan-completed.json`, then `workflows/alert-notify.json`.
3. Set webhook paths to the above, attach credentials to the Slack and HTTP Request nodes.
4. Activate the workflows.

## Notes

- Webhook response time must stay under minutes; these are async. No retries
  inside the app should depend on their reply.
- Do not include PII in webhook payloads. Only ids + counts + non-sensitive titles.
