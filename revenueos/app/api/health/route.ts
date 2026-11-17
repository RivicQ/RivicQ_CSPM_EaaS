import { ok } from "@/lib/api";
import { getStripeMode } from "@/lib/env";
import { isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok({
    status: "ok",
    stripeMode: getStripeMode(),
    stripeConfigured: isStripeConfigured(),
    timestamp: new Date().toISOString(),
  });
}
