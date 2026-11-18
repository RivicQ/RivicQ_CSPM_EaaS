import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/health/route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("health endpoint hardening", () => {
  it("minimizes public disclosure outside deployed environments", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DEPLOYED", undefined);
    vi.stubEnv("STRIPE_MODE", "test");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_should_not_leak");
    const response = await GET();
    const body = await response.json();
    expect(body).toEqual({ status: "ok", env: "development" });
    expect(JSON.stringify(body)).not.toContain("stripe");
  });

  it("returns minimal payload in deployed environments with a real JWT secret", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEPLOYED", "true");
    vi.stubEnv("JWT_SECRET", "a".repeat(40));
    const response = await GET();
    const body = await response.json();
    expect(body).toEqual({ status: "ok" });
  });

  it("requires a real JWT secret in deployed environments", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEPLOYED", "true");
    vi.stubEnv("JWT_SECRET", "short-secret");
    await expect(GET()).rejects.toThrow(/JWT_SECRET/);
  });
});
