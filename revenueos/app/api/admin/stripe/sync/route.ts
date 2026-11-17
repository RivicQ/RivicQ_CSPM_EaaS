import { handleRoute, ok } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { syncCatalogueToStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST() {
  return handleRoute(async () => {
    await requireStaff(["SUPER_ADMIN", "FOUNDER"]);
    const result = await syncCatalogueToStripe();
    return ok(result);
  });
}
