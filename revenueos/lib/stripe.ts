import { randomUUID } from "node:crypto";
import { Prisma, SubscriptionStatus } from "@prisma/client";
import Stripe from "stripe";
import { HttpError } from "./api";
import { writeAuditLog } from "./audit";
import { prisma } from "./db";
import { getAppUrl, getStripeSecretKey, getWebhookSecret } from "./env";
import { resolveRegionalPrice } from "./pricing";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const key = getStripeSecretKey();
  if (!key) throw new HttpError(503, "Stripe is not configured");
  if (!stripeClient) stripeClient = new Stripe(key);
  return stripeClient;
}

export function isStripeConfigured() {
  return Boolean(getStripeSecretKey() && getWebhookSecret());
}

export async function syncCatalogueToStripe() {
  const stripe = getStripeClient();
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { prices: { where: { active: true } } },
  });

  let productsCreated = 0;
  let pricesCreated = 0;

  for (const product of products) {
    let stripeProductId = product.stripeProductId;
    if (!stripeProductId) {
      const remote = await stripe.products.create({
        name: product.name,
        description: product.description,
        metadata: { rivicqProductId: product.id, rivicqProductCode: product.code },
      });
      stripeProductId = remote.id;
      await prisma.product.update({ where: { id: product.id }, data: { stripeProductId } });
      productsCreated += 1;
    }

    for (const price of product.prices) {
      if (price.stripePriceId) continue;
      const recurring =
        price.interval === "MONTHLY"
          ? { interval: "month" as const }
          : price.interval === "ANNUAL"
            ? { interval: "year" as const }
            : undefined;
      const remotePrice = await stripe.prices.create({
        product: stripeProductId,
        currency: price.currency.toLowerCase(),
        unit_amount: price.unitAmount,
        recurring,
        metadata: {
          rivicqPriceId: price.id,
          rivicqPriceBookVersion: price.priceBookVersion,
        },
      });
      await prisma.price.update({
        where: { id: price.id },
        data: { stripePriceId: remotePrice.id },
      });
      pricesCreated += 1;
    }
  }

  return { productsCreated, pricesCreated, productsSynced: products.length };
}

async function ensureStripeCustomer(customerId: string) {
  const existing = await prisma.stripeCustomer.findUnique({ where: { customerId } });
  if (existing) return existing.stripeCustomerId;

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new HttpError(404, "Customer not found");

  const stripe = getStripeClient();
  const remote = await stripe.customers.create({
    name: customer.name,
    email: customer.email,
    metadata: { rivicqCustomerId: customer.id },
  });

  await prisma.stripeCustomer.create({
    data: { customerId, stripeCustomerId: remote.id },
  });
  await prisma.customer.update({
    where: { id: customerId },
    data: { stripeCustomerId: remote.id },
  });
  return remote.id;
}

async function resolvePriceForCheckout(input: {
  priceId: string;
  country: string;
  currency: string;
}) {
  const price = await prisma.price.findUnique({
    where: { id: input.priceId },
    include: { product: true, regionalPrices: { where: { active: true } } },
  });
  if (!price || !price.active || !price.product.active) {
    throw new HttpError(404, "Price is not available");
  }

  const fx = await prisma.exchangeRate.findFirst({
    where: {
      baseCurrency: price.currency.toUpperCase(),
      quoteCurrency: input.currency.toUpperCase(),
    },
    orderBy: { effectiveAt: "desc" },
  });

  const resolved = resolveRegionalPrice({
    basePrice: price,
    regionalPrices: price.regionalPrices,
    country: input.country,
    currency: input.currency,
    exchangeRate: fx ? Number(fx.rate) : null,
    fxSource: fx?.source ?? null,
  });

  return { price, resolved };
}

function lineItemForPrice(input: {
  resolved: ReturnType<typeof resolveRegionalPrice>;
  productName: string;
  quantity: number;
  recurring: "MONTHLY" | "ANNUAL" | null;
  metadata: Record<string, string>;
}): Stripe.Checkout.SessionCreateParams.LineItem {
  const quantity = input.quantity;
  const recurring = input.recurring
    ? { interval: input.recurring === "MONTHLY" ? ("month" as const) : ("year" as const) }
    : undefined;

  return {
    price_data: {
      currency: input.resolved.currency.toLowerCase(),
      unit_amount: input.resolved.unitAmount,
      product_data: {
        name: input.productName,
        metadata: input.metadata,
      },
      recurring,
    },
    quantity,
  };
}

export async function createSubscriptionCheckout(input: {
  customerId: string;
  priceId: string;
  country: string;
  currency: string;
  quantity?: number;
}) {
  const { price, resolved } = await resolvePriceForCheckout(input);
  const stripeCustomerId = await ensureStripeCustomer(input.customerId);
  const quantity = input.quantity ?? 1;
  const amount = resolved.unitAmount * quantity;
  const orderReference = randomUUID();

  const payment = await prisma.payment.create({
    data: {
      customerId: input.customerId,
      amount,
      currency: resolved.currency,
      status: "PENDING",
      method: "stripe_checkout",
      orderReference,
    },
  });

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    client_reference_id: orderReference,
    billing_address_collection: "required",
    line_items: [
      lineItemForPrice({
        resolved,
        productName: price.product.name,
        quantity,
        recurring:
          price.interval === "MONTHLY" || price.interval === "ANNUAL" ? price.interval : null,
        metadata: {
          rivicqProductId: price.productId,
          rivicqPriceId: price.id,
          priceBookVersion: resolved.priceBookVersion,
        },
      }),
    ],
    metadata: {
      rivicqPaymentId: payment.id,
      rivicqCustomerId: input.customerId,
      rivicqPriceId: price.id,
      priceBookVersion: resolved.priceBookVersion,
      orderReference,
    },
    subscription_data: {
      metadata: {
        rivicqCustomerId: input.customerId,
        rivicqPriceId: price.id,
      },
    },
    success_url: `${getAppUrl()}/portal?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getAppUrl()}/portal?checkout=cancelled`,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  if (!session.url) throw new HttpError(502, "Stripe did not return a checkout URL");
  return { url: session.url, sessionId: session.id, orderReference };
}

export async function createQuotationCheckout(quotationId: string, actorId: string) {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { items: true, customer: true },
  });
  if (!quotation) throw new HttpError(404, "Quotation not found");
  if (quotation.status !== "APPROVED" && quotation.status !== "ACCEPTED") {
    throw new HttpError(409, "Only an approved quotation can generate a payment request");
  }
  if (new Date(quotation.validUntil).getTime() < Date.now()) {
    throw new HttpError(409, "Quotation has expired");
  }

  const existing = await prisma.payment.findFirst({
    where: { quotationId, status: "PENDING", stripeCheckoutSessionId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (existing?.stripeCheckoutSessionId) {
    const stripe = getStripeClient();
    const previous = await stripe.checkout.sessions.retrieve(existing.stripeCheckoutSessionId);
    if (previous.url && previous.status === "open") {
      return { url: previous.url, sessionId: previous.id, orderReference: existing.orderReference };
    }
  }

  const stripeCustomerId = await ensureStripeCustomer(quotation.customerId);
  const orderReference = randomUUID();
  const payment = await prisma.payment.create({
    data: {
      customerId: quotation.customerId,
      quotationId: quotation.id,
      amount: quotation.total,
      currency: quotation.currency,
      status: "PENDING",
      method: "stripe_checkout",
      orderReference,
    },
  });

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: stripeCustomerId,
    client_reference_id: orderReference,
    billing_address_collection: "required",
    line_items: quotation.items.map((item) => ({
      price_data: {
        currency: quotation.currency.toLowerCase(),
        unit_amount: item.unitAmount,
        product_data: {
          name: item.name,
          metadata: {
            rivicqQuotationId: quotation.id,
            rivicqQuotationItemId: item.id,
          },
        },
      },
      quantity: item.quantity,
    })),
    metadata: {
      rivicqPaymentId: payment.id,
      rivicqCustomerId: quotation.customerId,
      rivicqQuotationId: quotation.id,
      approvedById: quotation.approvedById ?? actorId,
      priceBookVersion: quotation.priceBookVersion,
      orderReference,
    },
    success_url: `${getAppUrl()}/portal?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getAppUrl()}/portal?checkout=cancelled`,
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { stripeCheckoutSessionId: session.id },
  });
  await writeAuditLog({
    actorId,
    action: "QUOTATION_CHECKOUT_CREATED",
    entityType: "Quotation",
    entityId: quotation.id,
    metadata: { paymentId: payment.id, orderReference },
  });

  if (!session.url) throw new HttpError(502, "Stripe did not return a checkout URL");
  return { url: session.url, sessionId: session.id, orderReference };
}

export async function createBillingPortalSession(customerId: string) {
  const stripeCustomer = await prisma.stripeCustomer.findUnique({ where: { customerId } });
  if (!stripeCustomer) throw new HttpError(404, "Billing account is not configured");
  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomer.stripeCustomerId,
    return_url: `${getAppUrl()}/portal`,
  });
  return { url: session.url };
}

export function verifyStripeWebhook(rawBody: string, signature: string) {
  const secret = getWebhookSecret();
  if (!secret) throw new HttpError(503, "Stripe webhook is not configured");
  return getStripeClient().webhooks.constructEvent(rawBody, signature, secret);
}

function mapSubscriptionStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
    case "unpaid":
      return "CANCELED";
    case "paused":
      return "PAUSED";
    default:
      return "INCOMPLETE";
  }
}

function periodFromSubscription(subscription: Stripe.Subscription) {
  const raw = subscription as unknown as Record<string, unknown>;
  const start = typeof raw.current_period_start === "number" ? raw.current_period_start : null;
  const end = typeof raw.current_period_end === "number" ? raw.current_period_end : null;
  return {
    currentPeriodStart: start ? new Date(start * 1000) : null,
    currentPeriodEnd: end ? new Date(end * 1000) : null,
  };
}

async function handleCheckoutSession(session: Stripe.Checkout.Session, succeeded: boolean) {
  const paymentId = session.metadata?.rivicqPaymentId;
  if (!paymentId) return;
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return;

  const period = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: succeeded ? "SUCCEEDED" : "FAILED",
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
    },
  });

  if (!succeeded) return;

  let invoice = payment.invoiceId
    ? await prisma.invoice.findUnique({ where: { id: payment.invoiceId } })
    : null;
  if (!invoice) {
    invoice = await prisma.invoice.create({
      data: {
        number: `INV-${period.orderReference.slice(0, 8).toUpperCase()}`,
        customerId: payment.customerId,
        quotationId: payment.quotationId,
        subscriptionId: payment.subscriptionId,
        currency: payment.currency,
        amount: payment.amount,
        taxAmount: 0,
        amountPaid: payment.amount,
        status: "PAID",
      },
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { invoiceId: invoice.id },
    });
  }

  const existingRecord = await prisma.revenueRecord.findFirst({
    where: { paymentId: payment.id, kind: "COLLECTED" },
  });
  if (!existingRecord) {
    await prisma.revenueRecord.create({
      data: {
        customerId: payment.customerId,
        paymentId: payment.id,
        invoiceId: invoice.id,
        category: payment.quotationId ? "ONE_TIME" : "RECURRING",
        kind: "COLLECTED",
        amount: payment.amount,
        currency: payment.currency,
        interval: payment.quotationId ? "ONE_TIME" : "MONTHLY",
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        description: `Stripe checkout ${session.id}`,
      },
    });
  }
}

async function handleSubscription(subscription: Stripe.Subscription, deleted = false) {
  const stripeSubscriptionId = subscription.id;
  const customerId = subscription.metadata?.rivicqCustomerId;
  const priceId = subscription.metadata?.rivicqPriceId;
  if (!customerId || !priceId) return;

  const period = periodFromSubscription(subscription);
  const data = {
    customerId,
    priceId,
    status: deleted ? ("CANCELED" as const) : mapSubscriptionStatus(subscription.status),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodStart: period.currentPeriodStart,
    currentPeriodEnd: period.currentPeriodEnd,
  };

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId },
    create: { stripeSubscriptionId, ...data },
    update: data,
  });
}

async function handleInvoiceEvent(invoice: Stripe.Invoice, eventType: string) {
  const stripeInvoiceId = invoice.id;
  const paymentId = invoice.metadata?.rivicqPaymentId;
  const amount = invoice.amount_paid || invoice.amount_due;
  const currency = invoice.currency.toUpperCase();

  const existing = await prisma.invoice.findUnique({ where: { stripeInvoiceId } });
  if (!existing && !paymentId) return;

  const linkedPayment = paymentId
    ? await prisma.payment.findUnique({ where: { id: paymentId } })
    : null;
  const data = {
    customerId: existing?.customerId ?? linkedPayment?.customerId ?? "",
    currency,
    amount,
    taxAmount:
      invoice.total_taxes?.reduce((sum, tax) => sum + tax.amount, 0) ?? 0,
    amountPaid: eventType === "invoice.paid" ? amount : existing?.amountPaid ?? 0,
    status: eventType === "invoice.paid" ? ("PAID" as const) : ("OPEN" as const),
  };
  if (!data.customerId) return;

  const saved = await prisma.invoice.upsert({
    where: { stripeInvoiceId },
    create: {
      ...data,
      number: invoice.number ?? `STRIPE-${stripeInvoiceId.slice(-10).toUpperCase()}`,
    },
    update: data,
  });

  if (paymentId && eventType === "invoice.paid") {
    await prisma.payment.updateMany({
      where: { id: paymentId },
      data: { status: "SUCCEEDED", invoiceId: saved.id },
    });
  }
}

async function handleRefund(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
  if (!paymentIntentId) return;
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
  });
  if (!payment) return;

  const refundId = charge.refunds?.data[0]?.id ?? `charge_${charge.id}`;
  const amount = charge.amount_refunded;
  try {
    await prisma.refund.create({
      data: {
        paymentId: payment.id,
        amount,
        reason: "Stripe refund webhook",
        stripeRefundId: refundId,
      },
    });
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
    await prisma.revenueRecord.create({
      data: {
        customerId: payment.customerId,
        paymentId: payment.id,
        category: "REFUND",
        kind: "COLLECTED",
        amount,
        currency: payment.currency,
        interval: "ONE_TIME",
        periodStart: new Date(),
        periodEnd: new Date(),
        description: `Stripe refund ${refundId}`,
      },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
  }
}

export async function processStripeEvent(event: Stripe.Event) {
  try {
    await prisma.stripeEvent.create({
      data: {
        id: event.id,
        type: event.type,
        status: "PROCESSING",
        payload: event as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { duplicate: true };
    }
    throw error;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSession(event.data.object as Stripe.Checkout.Session, true);
        break;
      case "checkout.session.async_payment_succeeded":
        await handleCheckoutSession(event.data.object as Stripe.Checkout.Session, true);
        break;
      case "checkout.session.async_payment_failed":
        await handleCheckoutSession(event.data.object as Stripe.Checkout.Session, false);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscription(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscription(event.data.object as Stripe.Subscription, true);
        break;
      case "invoice.paid":
      case "invoice.finalized":
        await handleInvoiceEvent(event.data.object as Stripe.Invoice, event.type);
        break;
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.metadata?.rivicqPaymentId) {
          await prisma.payment.updateMany({
            where: { id: invoice.metadata.rivicqPaymentId },
            data: { status: "FAILED" },
          });
        }
        await handleInvoiceEvent(invoice, event.type);
        break;
      }
      case "charge.refunded":
        await handleRefund(event.data.object as Stripe.Charge);
        break;
      default:
        break;
    }

    await prisma.stripeEvent.update({
      where: { id: event.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
    return { duplicate: false };
  } catch (error) {
    await prisma.stripeEvent.update({
      where: { id: event.id },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
        error: error instanceof Error ? error.message : "unknown error",
      },
    });
    throw error;
  }
}

export async function createAdminRefund(input: {
  paymentId: string;
  amount: number;
  reason: string;
  administratorId: string;
}) {
  const payment = await prisma.payment.findUnique({ where: { id: input.paymentId } });
  if (!payment) throw new HttpError(404, "Payment not found");
  if (payment.status !== "SUCCEEDED" && payment.status !== "REFUNDED") {
    throw new HttpError(409, "Only a successful payment can be refunded");
  }
  if (!payment.stripePaymentIntentId) {
    throw new HttpError(409, "Payment has no Stripe reference");
  }
  if (input.amount > payment.amount) {
    throw new HttpError(400, "Refund amount exceeds payment amount");
  }

  const stripe = getStripeClient();
  const refund = await stripe.refunds.create({
    payment_intent: payment.stripePaymentIntentId,
    amount: input.amount,
    reason: "requested_by_customer",
    metadata: {
      rivicqPaymentId: payment.id,
      rivicqAdministratorId: input.administratorId,
      rivicqReason: input.reason,
    },
  });

  await prisma.refund.create({
    data: {
      paymentId: payment.id,
      amount: input.amount,
      reason: input.reason,
      stripeRefundId: refund.id,
      administratorId: input.administratorId,
    },
  });
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "REFUNDED" },
  });
  await writeAuditLog({
    actorId: input.administratorId,
    action: "REFUND_CREATED",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { amount: input.amount, reason: input.reason, stripeRefundId: refund.id },
  });
  return { refundId: refund.id };
}

export async function requestSubscriptionCancellation(subscriptionId: string, customerId: string) {
  const subscription = await prisma.subscription.findFirst({ where: { id: subscriptionId, customerId } });
  if (!subscription) throw new HttpError(404, "Subscription not found");
  if (!subscription.stripeSubscriptionId) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true },
    });
    return { status: "CANCEL_REQUESTED" };
  }
  const stripe = getStripeClient();
  const updated = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelAtPeriodEnd: true, status: mapSubscriptionStatus(updated.status) },
  });
  return { status: "CANCEL_AT_PERIOD_END" };
}

export async function setSubscriptionStatus(subscriptionId: string, status: SubscriptionStatus) {
  return prisma.subscription.update({ where: { id: subscriptionId }, data: { status } });
}
