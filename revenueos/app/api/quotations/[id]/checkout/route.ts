import { handleRoute, HttpError, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isStaffRole } from "@/lib/env";
import { createQuotationCheckout } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const user = await requireUser();
    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) throw new HttpError(404, "Quotation not found");
    if (!isStaffRole(user.role) && quotation.customerId !== user.customerId) {
      throw new HttpError(403, "You cannot pay this quotation");
    }
    const result = await createQuotationCheckout(id, user.id);
    return ok(result);
  });
}
