import { ok } from "@/lib/api";
import { assertSecureRuntimeConfig, isDeployedEnvironment } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isDeployedEnvironment()) {
    assertSecureRuntimeConfig();
  }
  const deployed = isDeployedEnvironment();
  return ok({
    status: "ok",
    ...(deployed ? {} : { env: "development" }),
  });
}
