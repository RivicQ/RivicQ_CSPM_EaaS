import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/auth";
import { isStaffRole } from "@/lib/env";

export const dynamic = "force-dynamic";

const sections = [
  ["overview", "Overview"],
  ["products", "Products"],
  ["subscriptions", "Subscriptions"],
  ["audits", "Audit engagements"],
  ["services", "Services"],
  ["customers", "Customers"],
  ["quotations", "Quotations"],
  ["payments", "Payments"],
  ["invoices", "Invoices"],
  ["stripe", "Stripe"],
  ["pricing", "Pricing"],
  ["partners", "Partners"],
  ["analytics", "Analytics"],
  ["settings", "Settings"],
  ["audit-logs", "Audit logs"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user || !isStaffRole(user.role)) redirect("/login");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-violet-500/10 bg-[#080714] p-5 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="mb-6 flex items-center justify-between gap-2">
          <Link href="/" className="text-sm font-semibold text-white">
            RivicQ RevenueOS
          </Link>
          <LogoutButton />
        </div>
        <nav className="flex flex-wrap gap-1 lg:flex-col">
          {sections.map(([slug, label]) => (
            <Link
              key={slug}
              href={slug === "overview" ? "/admin" : `/admin/${slug}`}
              className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-violet-500/10 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>
        <p className="mt-6 text-xs text-slate-500">{user.email}</p>
        <p className="text-xs text-violet-300/70">{user.role}</p>
      </aside>
      <div className="p-6 lg:p-10">{children}</div>
    </div>
  );
}
