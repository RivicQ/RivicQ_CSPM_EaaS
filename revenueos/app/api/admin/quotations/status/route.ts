import { handleRoute, HttpError, ok } from "@/lib/api";
import { requireAdminApiAccess } from "@/lib/admin-data";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { isQuotationStatus, quotationUpdateData } from "@/lib/quotation-workflow";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const actor = await requireAdminApiAccess("quotations-status");
    const body = (await request.json()) as { id?: string; status?: string };
    if (!body.id || typeof body.status !== "string" || !isQuotationStatus(body.status)) {
      throw new HttpError(400, "Valid quotation id and status are required");
    }

    const existing = await prisma.quotation.findUnique({ where: { id: body.id } });
    if (!existing) throw new HttpError(404, "Quotation not found");

    const data = quotationUpdateData({
      from: existing.status,
      to: body.status,
      actorId: actor.id,
      existingApprovedAt: existing.approvedAt,
      existingApprovedById: existing.approvedById,
      existingAcceptedAt: existing.acceptedAt,
    });

    const quotation = await prisma.quotation.update({
      where: { id: body.id },
      data,
    });
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "QUOTATION_STATUS_CHANGED",
      entityType: "Quotation",
      entityId: quotation.id,
      metadata: { from: existing.status, to: quotation.status },
      ip: null,
    });
    return ok({ quotation });
  });
}
