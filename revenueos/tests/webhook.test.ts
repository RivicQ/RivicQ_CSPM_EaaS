import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertQuotationPaymentIntegrity,
  assertStripeEventMode,
  verifyStripeWebhook,
} from "../lib/stripe";

const webhookSecret = "whsec_local_test_secret";

const payload = JSON.stringify({
  id: "evt_local_test",
  object: "event",
  api_version: "2025-03-31.basil",
  created: 1_700_000_000,
  data: { object: {} },
  livemode: false,
  pending_webhooks: 0,
  request: null,
  type: "ping",
});

describe("Stripe webhook verification", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_MODE", "test");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_local_secret");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", webhookSecret);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts a correctly signed event", () => {
    const stripe = new Stripe("sk_test_local_secret");
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
    const event = verifyStripeWebhook(payload, signature);
    expect(event.id).toBe("evt_local_test");
    expect(event.type).toBe("ping");
  });

  it("rejects an invalid signature", () => {
    expect(() => verifyStripeWebhook(payload, "t=1,v1=deadbeef")).toThrow();
  });

  it("rejects live events while configured for test mode", () => {
    expect(() => assertStripeEventMode({ livemode: true })).toThrow(/configured mode/);
  });

  it("accepts test events while configured for test mode", () => {
    expect(() => assertStripeEventMode({ livemode: false })).not.toThrow();
  });

  it("rejects quotation checkout when line totals drift", () => {
    expect(() =>
      assertQuotationPaymentIntegrity({
        subtotal: 1_000,
        discountBps: 1_000,
        discountAmount: 100,
        taxAmount: 0,
        total: 900,
        items: [{ unitAmount: 400, quantity: 2 }],
      }),
    ).toThrow(/subtotal/);
  });

  it("rejects quotation checkout when discount or total drift", () => {
    expect(() =>
      assertQuotationPaymentIntegrity({
        subtotal: 1_000,
        discountBps: 1_000,
        discountAmount: 200,
        taxAmount: 0,
        total: 800,
        items: [{ unitAmount: 500, quantity: 2 }],
      }),
    ).toThrow(/discount/);
    expect(() =>
      assertQuotationPaymentIntegrity({
        subtotal: 1_000,
        discountBps: 1_000,
        discountAmount: 100,
        taxAmount: 0,
        total: 800,
        items: [{ unitAmount: 500, quantity: 2 }],
      }),
    ).toThrow(/total/);
  });
});
