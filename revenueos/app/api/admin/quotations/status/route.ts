import { handleRoute, HttpError, ok } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const allowedStatuses = [
  "DRAFT",
  "INTERNAL_REVIEW",
  "APPROVED",
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CONVERTED_TO_INVOICE",
];

export async function POST(request: Request) {
  return handleRoute(async () => {
    const actor = await requireStaff(["SUPER_ADMIN", "FOUNDER", "SALES_ADMIN", "FINANCE_ADMIN"]);
    const body = (await request.json()) as { id: string; status: string };
    if (!body.id || !allowedStatuses.includes(body.status)) {
      throw new HttpError(400, "Valid quotation id and status are required");
    }
    const existing = await prisma.quotation.findUnique({ where: { id: body.id } });
    if (!existing) throw new HttpError(404, "Quotation not found");

    const quotation = await prisma.quotation.update({
      where: { id: body.id },
      data: {
        status: body.status as never,
        approvedAt: body.status === "APPROVED" ? new Date() : existing.approvedAt,
        approvedById: body.status === "APPROVED" ? actor.id : existing.approvedById,
        acceptedAt: body.status === "ACCEPTED" ? new Date() : existing.acceptedAt,
      },
    });
    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "QUOTATION_STATUS_CHANGED",
      entityType: "Quotation",
      entityId: quotation.id,
      metadata: { from: existing.status, to: quotation.status },
    });
    return ok({ quotation });
  });
}
