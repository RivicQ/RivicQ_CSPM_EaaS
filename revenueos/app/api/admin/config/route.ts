import { handleRoute, HttpError, ok } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { assertLiveModeAllowed, getAppUrl, getStripeMode } from "@/lib/env";
import { isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleRoute(async () => {
    await requireStaff(["SUPER_ADMIN", "FOUNDER", "FINANCE_ADMIN"]);
    const mode = getStripeMode();
    let liveModeReady = false;
    try {
      assertLiveModeAllowed();
      liveModeReady = true;
    } catch {
      liveModeReady = false;
    }
    return ok({
      mode,
      liveModeReady,
      stripeConfigured: isStripeConfigured(),
      appUrl: getAppUrl(),
      note: "Live mode is controlled by environment configuration and deployment approval, not by this endpoint.",
    });
  });
}

export async function POST() {
  return handleRoute(async () => {
    await requireStaff(["SUPER_ADMIN", "FOUNDER"]);
    if (getStripeMode() !== "live") {
      throw new HttpError(409, "Application is in TEST MODE; live mode needs an environment change and deployment");
    }
    assertLiveModeAllowed();
    return ok({ approved: true, mode: "live" });
  });
}
