import { fail, HttpError, ok } from "@/lib/api";
import { processStripeEvent, verifyStripeWebhook } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return fail(400, "Missing Stripe signature");

  try {
    const rawBody = await request.text();
    const event = verifyStripeWebhook(rawBody, signature);
    const result = await processStripeEvent(event);
    return ok({ received: true, duplicate: result.duplicate });
  } catch (error) {
    if (error instanceof HttpError) return fail(error.status, error.message);
    return fail(400, "Invalid Stripe webhook");
  }
}
