export type StripeMode = "test" | "live";

const STAFF_ROLES = ["SUPER_ADMIN", "FOUNDER", "FINANCE_ADMIN", "SALES_ADMIN", "SALES_USER"] as const;

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function getStripeMode(): StripeMode {
  return process.env.STRIPE_MODE === "live" ? "live" : "test";
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100";
}

export function getSessionSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (isProduction()) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }
  return "revenueos-local-development-secret-not-for-production";
}

export function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  const mode = getStripeMode();
  if (mode === "live" && !key.startsWith("sk_live_")) {
    throw new Error("STRIPE_MODE=live requires a live secret key");
  }
  if (mode === "test" && !key.startsWith("sk_test_") && !key.startsWith("rk_test_")) {
    throw new Error("STRIPE_MODE=test requires a test secret key");
  }
  return key;
}

export function getWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null;
}

export function assertLiveModeAllowed() {
  if (getStripeMode() !== "live") {
    throw new Error("Application is in TEST MODE");
  }
  const approvals = [
    process.env.FOUNDER_LIVE_APPROVAL_TOKEN,
    process.env.DEPLOYMENT_APPROVAL_TOKEN,
    process.env.STRIPE_LIVE_APPROVAL_TOKEN,
  ];
  if (approvals.some((value) => !value)) {
    throw new Error("Live mode requires founder, deployment, and Stripe approval tokens");
  }
  if (new Set(approvals).size !== approvals.length) {
    throw new Error("Live mode approval tokens must be distinct");
  }
  if (!getAppUrl().startsWith("https://")) {
    throw new Error("Live mode requires an HTTPS application URL");
  }
}

export function isStaffRole(role: string) {
  return (STAFF_ROLES as readonly string[]).includes(role);
}
