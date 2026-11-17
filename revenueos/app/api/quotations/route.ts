import { randomUUID } from "node:crypto";
import { handleRoute, HttpError, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isStaffRole } from "@/lib/env";
import { calculateQuotationTotals } from "@/lib/pricing";
import { quotationSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleRoute(async () => {
    const user = await requireUser();
    const staff = isStaffRole(user.role);
    const quotations = await prisma.quotation.findMany({
      where: staff ? {} : { customerId: user.customerId ?? "__none__" },
      include: { items: true, customer: { select: { id: true, name: true, email: true, country: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return ok({ quotations });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const staff = isStaffRole(user.role);
    const body = quotationSchema.parse(await request.json());
    if (!staff && body.customerId !== user.customerId) {
      throw new HttpError(403, "Customers may only create quotations for their own account");
    }

    const validUntil = new Date(body.validUntil);
    if (Number.isNaN(validUntil.getTime())) throw new HttpError(400, "Invalid validity date");

    const tax = await prisma.taxConfiguration.findUnique({
      where: { country: body.country.toUpperCase() },
    });
    const totals = calculateQuotationTotals({
      items: body.items,
      discountBps: body.discountBps,
      taxRateBps: tax?.rateBps,
      currency: body.currency,
    });

    const number = `QUO-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
    const quotation = await prisma.quotation.create({
      data: {
        number,
        customerId: body.customerId,
        contactName: body.contactName,
        country: body.country.toUpperCase(),
        engagementType: body.engagementType,
        description: body.description,
        scope: body.scope,
        deliverables: body.deliverables,
        exclusions: body.exclusions,
        timeline: body.timeline,
        currency: totals.currency,
        subtotal: totals.subtotal,
        discountBps: body.discountBps ?? 0,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        total: totals.total,
        status: "DRAFT",
        validUntil,
        createdById: user.id,
        priceBookVersion: "2026-11-base-v1",
        items: {
          create: body.items.map((item) => ({
            productId: item.productId ?? null,
            name: item.name,
            description: item.description ?? null,
            quantity: item.quantity,
            unitAmount: item.unitAmount,
            amount: item.quantity * item.unitAmount,
            billingInterval: item.billingInterval ?? "ONE_TIME",
          })),
        },
      },
      include: { items: true },
    });

    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "QUOTATION_CREATED",
      entityType: "Quotation",
      entityId: quotation.id,
      metadata: { number, total: quotation.total, currency: quotation.currency },
    });
    return ok({ quotation }, 201);
  });
}
