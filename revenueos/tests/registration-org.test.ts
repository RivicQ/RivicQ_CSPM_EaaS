import { describe, expect, it } from "vitest";
import { buildTenantSafeOrganizationName, registrationResponse } from "../lib/registration";

describe("registration organization handling", () => {
  it("does not use the raw user-supplied organization name as a global join key", () => {
    const a = buildTenantSafeOrganizationName("Acme Inc", "alice@example.com");
    const b = buildTenantSafeOrganizationName("Acme Inc", "bob@example.com");
    expect(a).not.toBe("Acme Inc");
    expect(b).not.toBe("Acme Inc");
    expect(a).toMatch(/^acme-inc-[a-f0-9-]+$/);
    expect(b).toMatch(/^acme-inc-[a-f0-9-]+$/);
    expect(a).not.toBe(b);
  });

  it("creates a tenant-safe name even without an organization input", () => {
    const name = buildTenantSafeOrganizationName(undefined, "owner@example.com");
    expect(name).toMatch(/^owner-[a-f0-9-]+$/);
  });

  it("makes email verification explicit and does not issue a session", () => {
    const response = registrationResponse();
    expect(response.emailVerificationRequired).toBe(true);
    expect(response.registered).toBe(true);
    expect("token" in response).toBe(false);
    expect(response.message).toMatch(/verify/i);
  });
});
