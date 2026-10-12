// Frontend helper: call the Stripe checkout endpoint and redirect to Stripe.
//
// This is inert by default; it throws if the endpoint is unreachable or the
// server returns an error. Wire it to a billing button only after registering
// the Go handlers or a Convex HTTP action equivalent.

export interface CheckoutOptions {
  priceId: string;
  tenantId?: string;
  email?: string;
}

export async function startStripeCheckout(
  options: CheckoutOptions,
): Promise<void> {
  const res = await fetch("/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      priceId: options.priceId,
      tenantId: options.tenantId,
      email: options.email,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `checkout failed (${res.status})`);
  }
  const data = (await res.json()) as { url?: string };
  if (!data.url) {
    throw new Error("checkout response missing url");
  }
  window.location.assign(data.url);
}
