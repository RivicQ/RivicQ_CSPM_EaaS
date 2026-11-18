import { handleRoute, HttpError, ok } from "@/lib/api";
import { requireAdminApiAccess } from "@/lib/admin-data";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { isQuotationStatus, quotationUpdateData } from "@/lib/quotation-workflow";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const actor = await requireAdminApiAccess("quotations-status");
    const { id } = await params;
    const body = (await request.json()) as { status?: string };
    if (typeof body.status !== "string" || !isQuotationStatus(body.status)) {
      throw new HttpError(400, "Invalid quotation status");
    }

    const existing = await prisma.quotation.findUnique({ where: { id } });
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
      where: { id },
      data,
    });

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "QUOTATION_STATUS_CHANGED",
      entityType: "Quotation",
      entityId: id,
      metadata: { from: existing.status, to: quotation.status },
      ip: null,
    });
    return ok({ quotation });
  });
}
