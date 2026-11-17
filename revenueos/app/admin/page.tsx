import { Card, DataTable, PageHeader, StatCard } from "@/components/ui";
import { prisma } from "@/lib/db";
import { getStripeMode } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { asRevenueInterval, firstTenCustomerPlan, projectFinancials, summarizeRevenue } from "@/lib/revenue";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string; currency?: string; customers?: string }>;
}) {
  const params = await searchParams;
  const [customers, activeSubscriptions, pendingQuotations, succeededPayments, auditEngagements, revenueRecords] =
    await Promise.all([
      prisma.customer.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.quotation.count({ where: { status: { in: ["DRAFT", "INTERNAL_REVIEW"] } } }),
      prisma.payment.count({ where: { status: "SUCCEEDED" } }),
      prisma.auditEngagement.count(),
      prisma.revenueRecord.findMany({ take: 5000 }),
    ]);

  const summary = summarizeRevenue(
    revenueRecords.map((record) => ({
      category: record.category,
      kind: record.kind,
      amount: record.amount,
      currency: record.currency,
      interval: asRevenueInterval(record.interval),
    })),
  );
  const eur = summary.EUR;
  const inr = summary.INR;
  const scenario = ["CONSERVATIVE", "BASE", "AGGRESSIVE"].includes(params.scenario ?? "")
    ? (params.scenario as "CONSERVATIVE" | "BASE" | "AGGRESSIVE")
    : "BASE";
  const currency = params.currency === "INR" ? "INR" : "EUR";
  const parsedCount = Number(params.customers ?? "10");
  const customerCount = parsedCount === 25 || parsedCount === 50 ? parsedCount : 10;
  const projection = projectFinancials({ scenario, customerCount, currency });

  return (
    <main>
      <PageHeader
        eyebrow="Revenue operations"
        title="Overview"
        description="Financial truth is separated by currency and by contracted, invoiced, collected, and forecast records."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={String(customers)} />
        <StatCard label="Active subscriptions" value={String(activeSubscriptions)} />
        <StatCard label="Quotations in review" value={String(pendingQuotations)} />
        <StatCard label="Collected payments" value={String(succeededPayments)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="EUR position">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label="MRR" value={formatMoney(eur?.mrr ?? 0, "EUR")} />
            <StatCard label="ARR" value={formatMoney(eur?.arr ?? 0, "EUR")} />
            <StatCard label="Collected" value={formatMoney(eur?.collected ?? 0, "EUR")} />
            <StatCard label="Outstanding" value={formatMoney(eur?.outstanding ?? 0, "EUR")} />
          </div>
        </Card>
        <Card title="INR position">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label="MRR" value={formatMoney(inr?.mrr ?? 0, "INR", "en-IN")} />
            <StatCard label="ARR" value={formatMoney(inr?.arr ?? 0, "INR", "en-IN")} />
            <StatCard label="Collected" value={formatMoney(inr?.collected ?? 0, "INR", "en-IN")} />
            <StatCard label="Outstanding" value={formatMoney(inr?.outstanding ?? 0, "INR", "en-IN")} />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="First ten customer plan">
          <DataTable
            headers={["Region", "Count", "Packages"]}
            rows={firstTenCustomerPlan.customers.map((item) => [
              item.region,
              item.count,
              item.packages.join(", "),
            ])}
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <StatCard
              label="EUR target"
              value={formatMoney(firstTenCustomerPlan.targets.EUR.combined, "EUR")}
              note={`SaaS ${formatMoney(firstTenCustomerPlan.targets.EUR.saasArr, "EUR")} + audits ${formatMoney(firstTenCustomerPlan.targets.EUR.auditRevenue, "EUR")}`}
            />
            <StatCard
              label="INR target"
              value={formatMoney(firstTenCustomerPlan.targets.INR.combined, "INR", "en-IN")}
              note={`SaaS ${formatMoney(firstTenCustomerPlan.targets.INR.saasArr, "INR", "en-IN")} + audits ${formatMoney(firstTenCustomerPlan.targets.INR.auditRevenue, "INR", "en-IN")}`}
            />
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Targets are planning forecasts and are never treated as collected revenue.
          </p>
        </Card>

        <Card title="Scenario projection">
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            {(["CONSERVATIVE", "BASE", "AGGRESSIVE"] as const).map((item) => (
              <a
                key={item}
                href={`/admin?scenario=${item}&currency=${currency}&customers=${customerCount}`}
                className={`rounded-full border px-3 py-1 ${
                  item === scenario
                    ? "border-violet-400 bg-violet-500/20 text-white"
                    : "border-white/10 text-slate-400"
                }`}
              >
                {item}
              </a>
            ))}
          </div>
          <StatCard
            label={`${projection.currency} projection`}
            value={formatMoney(projection.projectedRevenue, projection.currency, projection.currency === "INR" ? "en-IN" : "en-GB")}
            note={`${projection.customerCount} customers · ${projection.scenario} · ${projection.basis}`}
          />
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {(["EUR", "INR"] as const).map((item) => (
              <a
                key={item}
                href={`/admin?scenario=${scenario}&currency=${item}&customers=${customerCount}`}
                className={`rounded-full border px-3 py-1 ${
                  item === currency ? "border-cyan-400 bg-cyan-500/20 text-white" : "border-white/10 text-slate-400"
                }`}
              >
                {item}
              </a>
            ))}
            {([10, 25, 50] as const).map((item) => (
              <a
                key={item}
                href={`/admin?scenario=${scenario}&currency=${currency}&customers=${item}`}
                className={`rounded-full border px-3 py-1 ${
                  item === customerCount ? "border-cyan-400 bg-cyan-500/20 text-white" : "border-white/10 text-slate-400"
                }`}
              >
                {item} customers
              </a>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Operating status">
          <DataTable
            headers={["Item", "Value"]}
            rows={[
              ["Stripe mode", getStripeMode().toUpperCase()],
              ["Audit engagements", auditEngagements],
              ["Forecast records", revenueRecords.filter((record) => record.kind === "FORECAST").length],
            ]}
          />
        </Card>
        <Card title="Commercial guardrails">
          <ul className="space-y-2 text-sm text-slate-300">
            <li>Approved quotations only for variable-price payment links.</li>
            <li>Stripe secrets never leave the server; browser receives checkout URLs only.</li>
            <li>Webhook signatures are verified and events are idempotent.</li>
            <li>Live mode requires founder, deployment, and Stripe approval tokens plus HTTPS.</li>
          </ul>
        </Card>
      </div>
    </main>
  );
}
