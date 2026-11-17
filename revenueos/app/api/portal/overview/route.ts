import { handleRoute, HttpError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createBillingPortalSession,
  requestSubscriptionCancellation,
} from "@/lib/stripe";
import { supportRequestSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    if (!user.customerId) {
      return ok({
        subscriptions: [],
        payments: [],
        invoices: [],
        quotations: [],
        supportRequests: [],
      });
    }
    const customerId = user.customerId;
    const [subscriptions, payments, invoices, quotations, supportRequests] = await Promise.all([
      prisma.subscription.findMany({
        where: { customerId },
        include: { price: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } }),
      prisma.invoice.findMany({ where: { customerId }, orderBy: { issuedAt: "desc" } }),
      prisma.quotation.findMany({
        where: { customerId },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.supportRequest.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } }),
    ]);
    return ok({ subscriptions, payments, invoices, quotations, supportRequests });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    if (!user.customerId) throw new HttpError(400, "No customer account is linked to this user");
    const payload = (await request.json()) as {
      action?: string;
      subscriptionId?: string;
      subject?: string;
      message?: string;
      quotationId?: string;
    };

    if (payload.action === "billing_portal") {
      return ok(await createBillingPortalSession(user.customerId));
    }
    if (payload.action === "cancel_subscription") {
      if (!payload.subscriptionId) throw new HttpError(400, "subscriptionId is required");
      return ok(
        await requestSubscriptionCancellation(payload.subscriptionId, user.customerId),
      );
    }
    if (payload.action === "support_request") {
      const body = supportRequestSchema.parse(payload);
      const supportRequest = await prisma.supportRequest.create({
        data: {
          customerId: user.customerId,
          subject: body.subject,
          message: body.message,
          quotationId: body.quotationId ?? null,
        },
      });
      return ok({ supportRequest }, 201);
    }
    throw new HttpError(400, "Unknown portal action");
  });
}
