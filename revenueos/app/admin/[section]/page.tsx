import { notFound } from "next/navigation";
import { AdminActionForm, PostButton } from "@/components/admin-actions";
import { Card, DataTable, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { assertLiveModeAllowed, getAppUrl, getStripeMode } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { asRevenueInterval, summarizeRevenue } from "@/lib/revenue";
import { isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const sectionTitles: Record<string, string> = {
  products: "Products",
  subscriptions: "Subscriptions",
  audits: "Audit engagements",
  services: "Services",
  customers: "Customers",
  quotations: "Quotations",
  payments: "Payments",
  invoices: "Invoices",
  stripe: "Stripe",
  pricing: "Pricing",
  partners: "Partners",
  analytics: "Analytics",
  settings: "Settings",
  "audit-logs": "Audit logs",
};

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const title = sectionTitles[section];
  if (!title) notFound();

  return (
    <main>
      <PageHeader eyebrow="Revenue operations" title={title} />
      {await renderSection(section)}
    </main>
  );
}

async function renderSection(section: string) {
  switch (section) {
    case "products": {
      const products = await prisma.product.findMany({
        include: { prices: { include: { regionalPrices: true } } },
        orderBy: { code: "asc" },
      });
      return (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card title="Catalogue">
            <DataTable
              headers={["Code", "Name", "Kind", "Interval", "Prices", "Active"]}
              rows={products.map((product) => [
                product.code,
                product.name,
                product.kind,
                product.billingInterval,
                product.prices.length,
                product.active ? "Yes" : "No",
              ])}
            />
          </Card>
          <div className="space-y-4">
            <AdminActionForm
              title="Create product"
              endpoint="/api/admin/products"
              fields={[
                { name: "code", label: "Code", placeholder: "RQ-SERVICE" },
                { name: "name", label: "Name" },
                { name: "description", label: "Description" },
                {
                  name: "kind",
                  label: "Kind",
                  options: ["SAAS", "AUDIT", "CONSULTING", "SUPPORT"],
                },
                {
                  name: "billingInterval",
                  label: "Billing interval",
                  options: ["MONTHLY", "ANNUAL", "ONE_TIME", "CUSTOM"],
                },
                { name: "defaultCurrency", label: "Currency", placeholder: "EUR" },
              ]}
            />
          </div>
        </div>
      );
    }

    case "subscriptions": {
      const subscriptions = await prisma.subscription.findMany({
        include: {
          customer: { select: { name: true, email: true } },
          price: { include: { product: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return (
        <Card title="Subscriptions">
          <DataTable
            headers={["Customer", "Product", "Status", "Currency", "Period end"]}
            rows={subscriptions.map((subscription) => [
              subscription.customer.email,
              subscription.price.product.name,
              subscription.status,
              subscription.price.currency,
              subscription.currentPeriodEnd?.toISOString().slice(0, 10) ?? "-",
            ])}
          />
        </Card>
      );
    }

    case "audits": {
      const engagements = await prisma.auditEngagement.findMany({
        include: {
          customer: { select: { name: true, email: true } },
          product: { select: { name: true } },
          deliverables: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return (
        <Card title="Audit engagements">
          <DataTable
            headers={["Customer", "Service", "Status", "Deliverables", "Start"]}
            rows={engagements.map((engagement) => [
              engagement.customer.email,
              engagement.product?.name ?? "-",
              engagement.status,
              engagement.deliverables.length,
              engagement.startDate?.toISOString().slice(0, 10) ?? "-",
            ])}
          />
        </Card>
      );
    }

    case "services": {
      const products = await prisma.product.findMany({
        where: { kind: { in: ["AUDIT", "CONSULTING", "SUPPORT"] } },
        orderBy: { name: "asc" },
      });
      return (
        <Card title="Professional services">
          <DataTable
            headers={["Code", "Name", "Kind", "Active"]}
            rows={products.map((product) => [
              product.code,
              product.name,
              product.kind,
              product.active ? "Yes" : "No",
            ])}
          />
        </Card>
      );
    }

    case "customers": {
      const customers = await prisma.customer.findMany({
        include: { organization: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });
      return (
        <Card title="Customers">
          <DataTable
            headers={["Name", "Email", "Organization", "Country", "Currency", "Status"]}
            rows={customers.map((customer) => [
              customer.name,
              customer.email,
              customer.organization?.name ?? "-",
              customer.country,
              customer.currency,
              customer.status,
            ])}
          />
        </Card>
      );
    }

    case "quotations": {
      const quotations = await prisma.quotation.findMany({
        include: { customer: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      });
      return (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card title="Quotations">
            <DataTable
              headers={["Number", "Customer", "Status", "Total", "Valid until"]}
              rows={quotations.map((quotation) => [
                quotation.number,
                quotation.customer.email,
                quotation.status,
                formatMoney(quotation.total, quotation.currency),
                quotation.validUntil.toISOString().slice(0, 10),
              ])}
            />
          </Card>
          <AdminActionForm
            title="Change quotation status"
            endpoint="/api/admin/quotations/status"
            fields={[
              { name: "id", label: "Quotation ID" },
              {
                name: "status",
                label: "Status",
                options: ["INTERNAL_REVIEW", "APPROVED", "SENT", "ACCEPTED", "REJECTED"],
              },
            ]}
          />
        </div>
      );
    }

    case "payments": {
      const payments = await prisma.payment.findMany({
        include: { customer: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
      });
      return (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card title="Payments">
            <DataTable
              headers={["Reference", "Customer", "Amount", "Status", "Method"]}
              rows={payments.map((payment) => [
                payment.orderReference,
                payment.customer.email,
                formatMoney(payment.amount, payment.currency),
                payment.status,
                payment.method,
              ])}
            />
          </Card>
          <AdminActionForm
            title="Issue refund"
            endpoint="/api/admin/refunds"
            fields={[
              { name: "paymentId", label: "Payment ID" },
              { name: "amount", label: "Amount in minor units", type: "number" },
              { name: "reason", label: "Reason" },
            ]}
          />
        </div>
      );
    }

    case "invoices": {
      const invoices = await prisma.invoice.findMany({
        include: { customer: { select: { email: true } } },
        orderBy: { issuedAt: "desc" },
      });
      return (
        <Card title="Invoices">
          <DataTable
            headers={["Number", "Customer", "Amount", "Paid", "Status"]}
            rows={invoices.map((invoice) => [
              invoice.number,
              invoice.customer.email,
              formatMoney(invoice.amount, invoice.currency),
              formatMoney(invoice.amountPaid, invoice.currency),
              invoice.status,
            ])}
          />
        </Card>
      );
    }

    case "stripe": {
      return (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Stripe connection">
            <DataTable
              headers={["Setting", "Value"]}
              rows={[
                ["Mode", getStripeMode().toUpperCase()],
                ["Configured", isStripeConfigured() ? "Yes" : "No"],
                ["App URL", getAppUrl()],
              ]}
            />
            <p className="mt-4 text-sm text-slate-400">
              {isStripeConfigured()
                ? "Sync products and prices before creating checkout links."
                : "Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to the server environment first."}
            </p>
          </Card>
          <PostButton endpoint="/api/admin/stripe/sync" label="Sync catalogue to Stripe" />
        </div>
      );
    }

    case "pricing": {
      const prices = await prisma.price.findMany({
        include: { product: true, regionalPrices: true },
        orderBy: [{ product: { code: "asc" } }],
      });
      return (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card title="Price book 2026-11-base-v1">
            <DataTable
              headers={["Product", "Currency", "Amount", "Interval", "Regions", "Stripe price"]}
              rows={prices.map((price) => [
                price.product.code,
                price.currency,
                formatMoney(price.unitAmount, price.currency),
                price.interval,
                price.regionalPrices.map((regional) => regional.country).join(", ") || "-",
                price.stripePriceId ? "Linked" : "Not linked",
              ])}
            />
          </Card>
          <div className="space-y-4">
            <AdminActionForm
              title="Create price"
              endpoint="/api/admin/prices"
              fields={[
                { name: "productId", label: "Product ID" },
                { name: "currency", label: "Currency", placeholder: "EUR" },
                { name: "unitAmount", label: "Amount in minor units", type: "number" },
                {
                  name: "interval",
                  label: "Interval",
                  options: ["MONTHLY", "ANNUAL", "ONE_TIME", "CUSTOM"],
                },
                { name: "priceBookVersion", label: "Price book", placeholder: "2026-11-base-v1" },
              ]}
            />
            <AdminActionForm
              title="Create regional price"
              endpoint="/api/admin/prices"
              fields={[
                { name: "kind", label: "Kind", options: ["regional"] },
                { name: "priceId", label: "Base price ID" },
                { name: "country", label: "Country code", placeholder: "IN" },
                { name: "currency", label: "Currency", placeholder: "INR" },
                { name: "unitAmount", label: "Amount in minor units", type: "number" },
                { name: "priceBookVersion", label: "Price book", placeholder: "2026-11-base-v1" },
              ]}
            />
          </div>
        </div>
      );
    }

    case "partners": {
      const [partners, commissions] = await Promise.all([
        prisma.partner.findMany({ orderBy: { name: "asc" } }),
        prisma.partnerCommission.findMany({
          include: { partner: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        }),
      ]);
      return (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Partners">
            <DataTable
              headers={["Name", "Type", "Commission", "Active"]}
              rows={partners.map((partner) => [
                partner.name,
                partner.type,
                `${partner.commissionRateBps / 100}%`,
                partner.active ? "Yes" : "No",
              ])}
            />
          </Card>
          <Card title="Commissions">
            <DataTable
              headers={["Partner", "Amount", "Status"]}
              rows={commissions.map((commission) => [
                commission.partner.name,
                formatMoney(commission.amount, commission.currency),
                commission.status,
              ])}
            />
          </Card>
        </div>
      );
    }

    case "analytics": {
      const records = await prisma.revenueRecord.findMany({
        orderBy: { periodStart: "desc" },
        take: 200,
      });
      const summary = summarizeRevenue(
        records.map((record) => ({
          category: record.category,
          kind: record.kind,
          amount: record.amount,
          currency: record.currency,
          interval: asRevenueInterval(record.interval),
        })),
      );
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Object.values(summary).map((item) => (
              <Card key={item.currency} title={`${item.currency} summary`}>
                <ul className="space-y-1 text-sm text-slate-300">
                  <li>MRR: {formatMoney(item.mrr, item.currency)}</li>
                  <li>ARR: {formatMoney(item.arr, item.currency)}</li>
                  <li>Collected: {formatMoney(item.collected, item.currency)}</li>
                  <li>Outstanding: {formatMoney(item.outstanding, item.currency)}</li>
                  <li>Forecast: {formatMoney(item.forecast, item.currency)}</li>
                </ul>
              </Card>
            ))}
          </div>
          <Card title="Revenue records">
            <DataTable
              headers={["Category", "Kind", "Amount", "Interval", "Description"]}
              rows={records.map((record) => [
                record.category,
                record.kind,
                formatMoney(record.amount, record.currency),
                record.interval ?? "-",
                record.description ?? "-",
              ])}
            />
          </Card>
        </div>
      );
    }

    case "settings": {
      let liveReady = false;
      let liveError = "";
      try {
        assertLiveModeAllowed();
        liveReady = true;
      } catch (error) {
        liveError = error instanceof Error ? error.message : "Unknown live-mode error";
      }
      return (
        <Card title="Environment and live-mode guardrails">
          <DataTable
            headers={["Setting", "Value"]}
            rows={[
              ["Stripe mode", getStripeMode().toUpperCase()],
              ["Live mode ready", liveReady ? "Yes" : "No"],
              ["App URL", getAppUrl()],
              ["Guardrail", liveError || "All approval gates satisfied"],
            ]}
          />
          <p className="mt-4 text-sm text-slate-400">
            Live mode is activated by changing server environment variables and redeploying, never from
            the browser.
          </p>
        </Card>
      );
    }

    case "audit-logs": {
      const logs = await prisma.auditLog.findMany({
        include: { actor: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
        take: 300,
      });
      return (
        <Card title="Audit trail">
          <DataTable
            headers={["Time", "Actor", "Action", "Entity", "ID"]}
            rows={logs.map((log) => [
              log.createdAt.toISOString().slice(0, 19).replace("T", " "),
              log.actor?.email ?? "system",
              log.action,
              log.entityType,
              log.entityId ?? "-",
            ])}
          />
        </Card>
      );
    }

    default:
      return null;
  }
}
