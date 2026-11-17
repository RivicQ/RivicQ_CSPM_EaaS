import { handleRoute, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { priceSchema, regionalPriceSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
const allowedRoles = ["SUPER_ADMIN", "FOUNDER", "FINANCE_ADMIN"];

export async function GET() {
  return handleRoute(async () => {
    const actor = await requireStaff(allowedRoles);
    const prices = await prisma.price.findMany({
      include: { product: true, regionalPrices: true },
      orderBy: [{ product: { code: "asc" } }, { currency: "asc" }],
    });
    await writeAuditLog({ actorId: actor.id, actorRole: actor.role, action: "PRICES_VIEW", entityType: "Price" });
    return ok({ prices });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const actor = await requireStaff(allowedRoles);
    const payload = await request.json();
    if (payload.kind === "regional") {
      const body = regionalPriceSchema.parse(payload);
      const regional = await prisma.regionalPrice.create({
        data: {
          priceId: body.priceId,
          country: body.country.toUpperCase(),
          currency: body.currency.toUpperCase(),
          unitAmount: body.unitAmount,
          taxCode: body.taxCode ?? null,
          priceBookVersion: body.priceBookVersion,
          active: true,
        },
      });
      await writeAuditLog({
        actorId: actor.id,
        actorRole: actor.role,
        action: "REGIONAL_PRICE_CREATED",
        entityType: "RegionalPrice",
        entityId: regional.id,
        metadata: { country: regional.country, currency: regional.currency },
      });
      return ok({ regional }, 201);
    }

    const body = priceSchema.parse(payload);
    const price = await prisma.price.create({
      data: {
        productId: body.productId,
        currency: body.currency.toUpperCase(),
        unitAmount: body.unitAmount,
        interval: body.interval,
        priceBookVersion: body.priceBookVersion,
        stripePriceId: body.stripePriceId ?? null,
        active: true,
      },
    });
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "PRICE_CREATED",
      entityType: "Price",
      entityId: price.id,
      metadata: { currency: price.currency, unitAmount: price.unitAmount },
    });
    return ok({ price }, 201);
  });
}

export async function PATCH(request: Request) {
  return handleRoute(async () => {
    const actor = await requireStaff(allowedRoles);
    const body = (await request.json()) as {
      id: string;
      unitAmount?: number;
      active?: boolean;
      stripePriceId?: string | null;
    };
    if (!body.id) throw new Error("Price id is required");
    const price = await prisma.price.update({
      where: { id: body.id },
      data: {
        unitAmount: body.unitAmount,
        active: body.active,
        stripePriceId: body.stripePriceId,
      },
    });
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "PRICE_UPDATED",
      entityType: "Price",
      entityId: price.id,
      metadata: { unitAmount: price.unitAmount, active: price.active },
    });
    return ok({ price });
  });
}
