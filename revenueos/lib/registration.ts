import { randomUUID } from "node:crypto";

export function buildTenantSafeOrganizationName(inputName: string | undefined, email: string) {
  const base = (inputName ?? email.split("@")[0] ?? "tenant")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "tenant";
  return `${base}-${randomUUID().slice(0, 8)}`;
}

export function registrationResponse() {
  return {
    registered: true,
    emailVerificationRequired: true,
    message: "Registration received. Verify email ownership before signing in.",
  };
}
