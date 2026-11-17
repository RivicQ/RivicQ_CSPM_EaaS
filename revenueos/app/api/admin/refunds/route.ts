import { handleRoute, ok } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { createAdminRefund } from "@/lib/stripe";
import { refundSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const actor = await requireStaff(["SUPER_ADMIN", "FOUNDER", "FINANCE_ADMIN"]);
    const body = refundSchema.parse(await request.json());
    const refund = await createAdminRefund({ ...body, administratorId: actor.id });
    return ok(refund, 201);
  });
}
