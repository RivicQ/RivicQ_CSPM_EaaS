import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  writeAuditLog: vi.fn(),
  verifyPassword: vi.fn(),
  issueSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: mocks.writeAuditLog,
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    verifyPassword: mocks.verifyPassword,
    issueSession: mocks.issueSession,
  };
});

import { POST } from "../app/api/auth/login/route";
import { resetRateLimits } from "../lib/rate-limit";

function loginRequest(email = "user@example.com", password = "CorrectHorseBattery12") {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

describe("login rate limiting and audit", () => {
  beforeEach(() => {
    resetRateLimits();
    mocks.findUnique.mockReset();
    mocks.writeAuditLog.mockReset();
    mocks.verifyPassword.mockReset();
    mocks.issueSession.mockReset();
    mocks.writeAuditLog.mockResolvedValue(undefined);
    mocks.issueSession.mockResolvedValue("session-token");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("TRUST_PROXY", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("audits failed login attempts", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user_1",
      email: "user@example.com",
      name: "User",
      role: "CUSTOMER",
      passwordHash: "hash",
    });
    mocks.verifyPassword.mockResolvedValue(false);

    const response = await POST(loginRequest());
    expect(response.status).toBe(401);
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "LOGIN_FAILED",
        entityType: "User",
        entityId: "user_1",
        metadata: expect.objectContaining({ email: "user@example.com", reason: "invalid_password" }),
      }),
    );
  });

  it("rate limits repeated failed attempts per account and audits the block", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user_1",
      email: "user@example.com",
      name: "User",
      role: "CUSTOMER",
      passwordHash: "hash",
    });
    mocks.verifyPassword.mockResolvedValue(false);

    for (let i = 0; i < 5; i += 1) {
      const response = await POST(loginRequest());
      expect(response.status).toBe(401);
    }

    const blocked = await POST(loginRequest());
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual(
      expect.objectContaining({ error: expect.stringMatching(/Too many login attempts/i) }),
    );
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "LOGIN_RATE_LIMITED",
        metadata: expect.objectContaining({ email: "user@example.com", accountAllowed: false }),
      }),
    );
  });
});
