import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// HTTP actions for the pivot. Currently exposes only the Stripe webhook.
//
// When Better Auth is enabled (phase 1), mount its routes here as well:
//   import { authComponent, createAuth } from "./auth";
//   authComponent.registerRoutes(http, createAuth);
// That module is created by `npx convex dev` once auth.config.ts is present.

const http = httpRouter();

// Stripe signature verification needs the `stripe` npm package:
//   npm install stripe
// It is intentionally not in package.json yet because this endpoint is inert.
// import Stripe from "stripe";
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: "2026-01-28.clover",
// });

// Records a verified billing event. Internal only: reachable via
// ctx.runMutation, never directly from a client.
export const recordStripeEvent = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    tenantId: v.optional(v.string()),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("auditLogs", {
      tenantId: args.tenantId,
      eventType: `stripe.${args.eventType}`,
      actorId: "stripe",
      requestId: args.eventId,
      metadata: { payload: args.payload },
      createdAt: now,
    });
  },
});

// POST /stripe/webhook
// Verifies the Stripe signature against STRIPE_WEBHOOK_SECRET, then delegates to
// the internal mutation above. Never logs or stores raw card data.
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("webhook not configured", { status: 503 });
    }
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("missing stripe-signature", { status: 400 });
    }
    // const payload = await request.text();
    // let event: Stripe.Event;
    // try {
    //   event = await stripe.webhooks.constructEventAsync(
    //     payload,
    //     signature,
    //     webhookSecret,
    //   );
    // } catch (err) {
    //   return new Response(`invalid signature: ${(err as Error).message}`, {
    //     status: 400,
    //   });
    // }
    //
    // await ctx.runMutation(internal.http.recordStripeEvent, {
    //   eventId: event.id,
    //   eventType: event.type,
    //   tenantId: (event.data.object as { metadata?: { tenantId?: string } })
    //     .metadata?.tenantId,
    //   payload: event.data.object,
    // });
    //
    // return new Response("ok", { status: 200 });
    void signature;
    return new Response("stripe webhook endpoint is inert", { status: 501 });
  }),
});

export default http;
