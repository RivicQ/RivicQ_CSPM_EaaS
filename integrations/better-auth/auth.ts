import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";

// Standalone Better Auth server config.
//
// In the Convex deployment the Convex component supplies the database adapter,
// so the instance is actually created in convex/auth.config.ts (createAuthInstance)
// using the adapter from `createClient(components.betterAuth)`. This file shows
// the same options without the adapter so it can be used by the `auth` CLI for
// schema generation and by non-Convex tooling.
//
// Secrets are read from the environment only. There is no default secret.

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret) {
  throw new Error("BETTER_AUTH_SECRET is not set");
}

const baseURL = process.env.BETTER_AUTH_URL;

export const auth = betterAuth({
  baseURL,
  secret,
  // database: authComponent.adapter(ctx)  <-- wired in convex/auth.config.ts
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // tighten once email delivery is wired
  },
  // Roles must match internal/authn/authn.go: admin > operator > analyst > viewer.
  plugins: [
    organization({
      // The organization is the tenant boundary; membership carries the role.
      allowUserToCreateOrganization: true,
    }),
  ],
  session: {
    // Keep lifetimes conservative; Better Auth rotates refresh tokens itself.
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});

export type Auth = typeof auth;
