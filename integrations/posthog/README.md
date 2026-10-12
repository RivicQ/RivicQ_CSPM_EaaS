# PostHog integration

Product analytics for the React app (`web/`), gated behind an env var and OFF
until `REACT_APP_POSTHOG_KEY` is present.

## Setup

1. Create a PostHog project and copy the project API key (public, client-safe).
2. Add to the frontend env:
   - `REACT_APP_POSTHOG_KEY` (project API key)
   - `REACT_APP_POSTHOG_HOST` (defaults to `https://us.i.posthog.com`)
3. Call `initPostHog()` once (e.g. in `web/src/index.tsx`), then `capture(...)`.

The module is a no-op when unconfigured, so importing it is safe today.

## Privacy

- **No PII in event props.** Send ids, not emails/names/tokens. Use the PostHog
  distinct id (a Better Auth user id), never an email.
- `autocapture` is disabled; capture only explicit, reviewed events.
- Respect **Do Not Track**: initialization is skipped when
  `navigator.doNotTrack === "1"`.
- Keep `disable_session_recording: true` until a privacy review approves replays.

## Events

| Event | When |
| --- | --- |
| `scan.started` | user kicks off a scan |
| `scan.completed` | scan finishes (mirrors the n8n trigger) |
| `finding.viewed` | user opens a finding |
| `checkout.started` | Stripe Checkout session created |
