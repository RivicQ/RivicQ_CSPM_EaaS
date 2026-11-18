import { handleRoute, ok } from "@/lib/api";
import { requireAdminApiAccess } from "@/lib/admin-data";
import { syncCatalogueToStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST() {
  return handleRoute(async () => {
    await requireAdminApiAccess("stripe-sync");
    const result = await syncCatalogueToStripe();
    return ok(result);
  });
}
