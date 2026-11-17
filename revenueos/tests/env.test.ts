import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertLiveModeAllowed,
  getAppUrl,
  getStripeMode,
  getStripeSecretKey,
  isStaffRole,
} from "../lib/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("environment guardrails", () => {
  it("defaults Stripe to test mode", () => {
    vi.stubEnv("STRIPE_MODE", undefined);
    expect(getStripeMode()).toBe("test");
  });

  it("rejects a live key while in test mode", () => {
    vi.stubEnv("STRIPE_MODE", "test");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_123");
    expect(() => getStripeSecretKey()).toThrow("requires a test secret key");
  });

  it("requires distinct approval tokens and HTTPS for live mode", () => {
    vi.stubEnv("STRIPE_MODE", "live");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://rivicq.example");
    vi.stubEnv("FOUNDER_LIVE_APPROVAL_TOKEN", "a");
    vi.stubEnv("DEPLOYMENT_APPROVAL_TOKEN", "a");
    vi.stubEnv("STRIPE_LIVE_APPROVAL_TOKEN", "c");
    expect(() => assertLiveModeAllowed()).toThrow("tokens must be distinct");

    vi.stubEnv("DEPLOYMENT_APPROVAL_TOKEN", "b");
    expect(() => assertLiveModeAllowed()).not.toThrow();
  });

  it("rejects non-HTTPS live mode", () => {
    vi.stubEnv("STRIPE_MODE", "live");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3100");
    vi.stubEnv("FOUNDER_LIVE_APPROVAL_TOKEN", "a");
    vi.stubEnv("DEPLOYMENT_APPROVAL_TOKEN", "b");
    vi.stubEnv("STRIPE_LIVE_APPROVAL_TOKEN", "c");
    expect(() => assertLiveModeAllowed()).toThrow("HTTPS application URL");
  });

  it("resolves the application URL and staff roles", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://billing.rivicq.com");
    expect(getAppUrl()).toBe("https://billing.rivicq.com");
    expect(isStaffRole("FINANCE_ADMIN")).toBe(true);
    expect(isStaffRole("CUSTOMER")).toBe(false);
  });
});
