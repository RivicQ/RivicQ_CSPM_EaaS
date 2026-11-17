import { handleRoute, HttpError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createSubscriptionCheckout } from "@/lib/stripe";
import { subscriptionCheckoutSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    if (!user.customerId) throw new HttpError(400, "No customer account is linked to this user");
    const body = subscriptionCheckoutSchema.parse(await request.json());
    const result = await createSubscriptionCheckout({ ...body, customerId: user.customerId });
    return ok(result);
  });
}
