import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isStaffRole } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function ConsolePage() {
  const user = await getSession();
  if (!user) redirect("/login");
  redirect(isStaffRole(user.role) ? "/admin" : "/portal");
}
