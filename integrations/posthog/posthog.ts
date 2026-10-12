// Env-gated PostHog init. Inert until REACT_APP_POSTHOG_KEY is set.
//
// install: npm install posthog-js
// (not added to web/package.json yet; this scaffold is not wired into the app)

type PostHogLike = {
  capture: (event: string, props?: Record<string, unknown>) => void;
  identify: (distinctId: string, props?: Record<string, unknown>) => void;
  reset: () => void;
};

// Client-safe env only. CRA requires the REACT_APP_ prefix.
const key = process.env.REACT_APP_POSTHOG_KEY || "";
const host =
  process.env.REACT_APP_POSTHOG_HOST || "https://us.i.posthog.com";

export const isPostHogConfigured = Boolean(key);

function dntEnabled(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    navigator.doNotTrack === "1" ||
    (window as unknown as { doNotTrack?: string }).doNotTrack === "1"
  );
}

let client: PostHogLike | null = null;

// initPostHog lazily imports posthog-js and returns a no-op when unconfigured
// or when the user has Do Not Track enabled.
export async function initPostHog(): Promise<void> {
  if (!isPostHogConfigured || dntEnabled() || client) {
    return;
  }
  const mod = await import("posthog-js");
  const posthog = mod.default;
  posthog.init(key, {
    api_host: host,
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
    person_profiles: "identified_only",
    persistence: "localStorage+cookie",
  });
  client = posthog as unknown as PostHogLike;
}

// capture is a no-op until initPostHog succeeds.
// Never pass PII (emails, names, tokens) in props.
export function capture(event: string, props?: Record<string, unknown>): void {
  if (!client) return;
  client.capture(event, props);
}

export function identify(distinctId: string, props?: Record<string, unknown>): void {
  if (!client) return;
  client.identify(distinctId, props);
}

export function reset(): void {
  if (!client) return;
  client.reset();
}
