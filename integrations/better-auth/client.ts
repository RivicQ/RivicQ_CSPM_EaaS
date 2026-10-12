import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

// React client factory. Env-driven base URL, no secrets on the client.
//
// Phase 1 wiring: replace the signIn/signUp/signOut calls in
// web/src/services/supabase.ts with this client. Keep it behind an env flag so
// the existing Supabase path stays default until the migration PR lands.
//
//   const { data } = await authClient.signIn.email({ email, password });
//
// Client-safe env only (CRA requires the REACT_APP_ prefix).

const baseURL = process.env.REACT_APP_BETTER_AUTH_URL || "";

export const isBetterAuthConfigured = Boolean(baseURL);

export const authClient = isBetterAuthConfigured
  ? createAuthClient({
      baseURL,
      plugins: [organizationClient()],
    })
  : null;

export type AuthClient = NonNullable<typeof authClient>;
