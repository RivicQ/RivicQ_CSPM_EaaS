import type { AuthConfig } from "convex/server";
import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import { betterAuth } from "better-auth";
import { convex } from "@convex-dev/better-auth/plugins";

// Server-side provider config. Convex validates the Better Auth JWT with a
// customJwt provider whose JWKS lives at CONVEX_SITE_URL/api/auth/convex/jwks.
const authConfig = {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;

export default authConfig;

// createAuthInstance is the Better Auth instance factory used by the component
// client in convex/auth.ts, where the Convex component adapter is attached:
//
//   import authConfig from "./auth.config";
//   const authComponent = createClient<DataModel>(components.betterAuth);
//   export const createAuth = (ctx: GenericCtx<DataModel>) =>
//     createAuthInstance(ctx, authComponent.adapter(ctx));
//
// The secret is read from the environment only; it is never hardcoded. Set it on
// the deployment with `npx convex env set BETTER_AUTH_SECRET "$BETTER_AUTH_SECRET"`.
export function createAuthInstance(ctx: unknown, database: unknown) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is not set");
  }
  return betterAuth({
    baseURL: process.env.CONVEX_SITE_URL,
    secret,
    database,
    emailAndPassword: { enabled: true },
    plugins: [
      // The convex() plugin wires JWT issuance and cookie handling. Pass the
      // same authConfig exported above so the component and provider agree.
      convex({ authConfig }),
    ],
  });
}
