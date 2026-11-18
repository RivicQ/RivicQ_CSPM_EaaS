import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { defaultPostLoginPath } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function ConsolePage() {
  const user = await getSession();
  if (!user) redirect("/login");
  redirect(defaultPostLoginPath(user.role));
}
