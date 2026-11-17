import { handleRoute, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { productSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleRoute(async () => {
    const actor = await requireStaff();
    const products = await prisma.product.findMany({
      include: { prices: true },
      orderBy: { code: "asc" },
    });
    await writeAuditLog({ actorId: actor.id, actorRole: actor.role, action: "PRODUCTS_VIEW", entityType: "Product" });
    return ok({ products });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const actor = await requireStaff(["SUPER_ADMIN", "FOUNDER", "SALES_ADMIN"]);
    const body = productSchema.parse(await request.json());
    const product = await prisma.product.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description,
        kind: body.kind,
        billingInterval: body.billingInterval,
        defaultCurrency: body.defaultCurrency,
        active: body.active ?? true,
      },
    });
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "PRODUCT_CREATED",
      entityType: "Product",
      entityId: product.id,
      metadata: { code: product.code },
    });
    return ok({ product }, 201);
  });
}

export async function PATCH(request: Request) {
  return handleRoute(async () => {
    const actor = await requireStaff(["SUPER_ADMIN", "FOUNDER", "SALES_ADMIN"]);
    const body = (await request.json()) as { id: string; active?: boolean; name?: string; description?: string };
    if (!body.id) throw new Error("Product id is required");
    const product = await prisma.product.update({
      where: { id: body.id },
      data: {
        active: body.active,
        name: body.name,
        description: body.description,
      },
    });
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "PRODUCT_UPDATED",
      entityType: "Product",
      entityId: product.id,
      metadata: { active: product.active },
    });
    return ok({ product });
  });
}
