import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2),
  organization: z.string().min(2).optional(),
  country: z.string().min(2),
});

export const customerSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  country: z.string().min(2),
  currency: z.string().length(3),
  organizationId: z.string().optional(),
});

export const productSchema = z.object({
  code: z.string().min(2).max(64),
  name: z.string().min(2),
  description: z.string().min(2),
  kind: z.enum(["SAAS", "AUDIT", "CONSULTING", "SUPPORT"]),
  billingInterval: z.enum(["MONTHLY", "ANNUAL", "ONE_TIME", "CUSTOM"]),
  defaultCurrency: z.string().length(3),
  active: z.boolean().optional(),
});

export const priceSchema = z.object({
  productId: z.string().min(1),
  currency: z.string().length(3),
  unitAmount: z.number().int().nonnegative(),
  interval: z.enum(["MONTHLY", "ANNUAL", "ONE_TIME", "CUSTOM"]),
  priceBookVersion: z.string().min(1),
  stripePriceId: z.string().optional(),
});

export const pricePatchSchema = z
  .object({
    id: z.string().min(1),
    unitAmount: z.number().int().nonnegative().optional(),
    active: z.boolean().optional(),
    stripePriceId: z.string().min(1).nullable().optional(),
  })
  .refine(
    (value) =>
      value.unitAmount !== undefined ||
      value.active !== undefined ||
      value.stripePriceId !== undefined,
    "At least one price field is required",
  );

export const regionalPriceSchema = z.object({
  priceId: z.string().min(1),
  country: z.string().min(2),
  currency: z.string().length(3),
  unitAmount: z.number().int().nonnegative(),
  taxCode: z.string().optional(),
  priceBookVersion: z.string().min(1),
});

export const quotationSchema = z.object({
  customerId: z.string().min(1),
  contactName: z.string().min(2),
  country: z.string().min(2),
  engagementType: z.string().min(2),
  description: z.string().min(2),
  scope: z.string().min(2),
  deliverables: z.string().min(2),
  exclusions: z.string().min(1),
  timeline: z.string().min(2),
  currency: z.string().length(3),
  validUntil: z.string().min(1),
  discountBps: z.number().int().min(0).max(10000).optional(),
  taxRateBps: z.number().int().min(0).max(10000).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        quantity: z.number().int().positive(),
        unitAmount: z.number().int().nonnegative(),
        billingInterval: z
          .enum(["MONTHLY", "ANNUAL", "ONE_TIME", "CUSTOM"])
          .optional(),
      }),
    )
    .min(1),
});

export const subscriptionCheckoutSchema = z.object({
  priceId: z.string().min(1),
  country: z.string().min(2),
  currency: z.string().length(3),
  quantity: z.number().int().positive().optional(),
});

export const refundSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.number().int().positive(),
  reason: z.string().min(3),
});

export const supportRequestSchema = z.object({
  subject: z.string().min(3),
  message: z.string().min(10),
  quotationId: z.string().optional(),
});
