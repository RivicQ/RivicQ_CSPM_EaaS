import { handleRoute, ok } from "@/lib/api";
import { requireAdminApiAccess } from "@/lib/admin-data";
import { createAdminRefund } from "@/lib/stripe";
import { refundSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const actor = await requireAdminApiAccess("refunds");
    const body = refundSchema.parse(await request.json());
    const refund = await createAdminRefund({ ...body, administratorId: actor.id });
    return ok(refund, 201);
  });
}
