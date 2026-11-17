import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
  verifySessionToken,
} from "../lib/auth";

describe("authentication primitives", () => {
  it("hashes and verifies passwords without storing plaintext", async () => {
    const hash = await hashPassword("CorrectHorse9!");
    expect(hash).not.toContain("CorrectHorse9!");
    expect(await verifyPassword("CorrectHorse9!", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("signs and verifies session tokens", async () => {
    const token = await createSessionToken("user_1", "FOUNDER");
    const payload = await verifySessionToken(token);
    expect(payload).toEqual({ userId: "user_1", role: "FOUNDER" });
  });

  it("rejects tampered session tokens", async () => {
    const token = await createSessionToken("user_1", "CUSTOMER");
    const tampered = `${token.slice(0, -2)}xx`;
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("hashes session tokens for storage", () => {
    const first = hashSessionToken("token-a");
    const second = hashSessionToken("token-a");
    expect(first).toBe(second);
    expect(first).not.toBe("token-a");
    expect(first).toHaveLength(64);
  });
});
