import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckoutForm,
  PayQuotationButton,
  PortalActionButton,
  SupportForm,
} from "@/components/portal-actions";
import { Card, DataTable, PageHeader, StatCard } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  if (!user.customerId) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-sm text-violet-300">
            RivicQ
          </Link>
          <LogoutButton />
        </div>
        <PageHeader
          eyebrow="Customer portal"
          title={user.name}
          description="Your account is not linked to a customer record yet. Contact sales to complete provisioning."
        />
      </main>
    );
  }

  const customerId = user.customerId;
  const [customer, subscriptions, payments, invoices, quotations, supportRequests, prices] =
    await Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.subscription.findMany({
        where: { customerId },
        include: { price: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } }),
      prisma.invoice.findMany({ where: { customerId }, orderBy: { issuedAt: "desc" } }),
      prisma.quotation.findMany({
        where: { customerId },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.supportRequest.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } }),
      prisma.price.findMany({
        where: { active: true, product: { active: true, kind: "SAAS" } },
        include: { product: true, regionalPrices: { where: { active: true } } },
      }),
    ]);

  const checkoutPrices = prices
    .filter((price) => price.currency.toUpperCase() === (customer?.currency ?? "EUR"))
    .map((price) => ({
      id: price.id,
      label: `${price.product.name} · ${formatMoney(price.unitAmount, price.currency)}`,
    }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-sm text-violet-300">
          RivicQ
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{user.email}</span>
          <LogoutButton />
        </div>
      </div>

      <PageHeader
        eyebrow="Customer portal"
        title={`Welcome, ${user.name}`}
        description="Review approved quotes, subscriptions, invoices, and secure payment status."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Subscriptions" value={String(subscriptions.length)} />
        <StatCard label="Invoices" value={String(invoices.length)} />
        <StatCard label="Approved quotations" value={String(quotations.filter((q) => q.status === "APPROVED").length)} />
        <StatCard label="Open requests" value={String(supportRequests.filter((request) => request.status === "OPEN").length)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Quotations">
          <DataTable
            headers={["Number", "Status", "Total", "Action"]}
            rows={quotations.map((quotation) => [
              quotation.number,
              quotation.status,
              formatMoney(quotation.total, quotation.currency),
              <PayQuotationButton
                key={quotation.id}
                quotationId={quotation.id}
                disabled={quotation.status !== "APPROVED" && quotation.status !== "ACCEPTED"}
              />,
            ])}
          />
        </Card>

        <Card title="Subscriptions">
          <DataTable
            headers={["Plan", "Status", "Renewal", "Action"]}
            rows={subscriptions.map((subscription) => [
              subscription.price.product.name,
              subscription.status,
              subscription.currentPeriodEnd?.toISOString().slice(0, 10) ?? "-",
              <PortalActionButton
                key={subscription.id}
                action="cancel_subscription"
                subscriptionId={subscription.id}
                label="Cancel at renewal"
              />,
            ])}
          />
          <div className="mt-5 border-t border-white/10 pt-5">
            <h3 className="mb-3 text-sm font-semibold text-violet-200">Start a subscription</h3>
            <CheckoutForm
              prices={checkoutPrices}
              country={customer?.country ?? "DE"}
              currency={customer?.currency ?? "EUR"}
            />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Payments">
          <DataTable
            headers={["Reference", "Amount", "Status", "Date"]}
            rows={payments.map((payment) => [
              payment.orderReference,
              formatMoney(payment.amount, payment.currency),
              payment.status,
              payment.createdAt.toISOString().slice(0, 10),
            ])}
          />
          <div className="mt-4">
            <PortalActionButton action="billing_portal" label="Manage billing details" />
          </div>
        </Card>

        <Card title="Invoices">
          <DataTable
            headers={["Number", "Amount", "Paid", "Status"]}
            rows={invoices.map((invoice) => [
              invoice.number,
              formatMoney(invoice.amount, invoice.currency),
              formatMoney(invoice.amountPaid, invoice.currency),
              invoice.status,
            ])}
          />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Support">
          <SupportForm />
        </Card>
        <Card title="Request history">
          <DataTable
            headers={["Subject", "Status", "Created"]}
            rows={supportRequests.map((request) => [
              request.subject,
              request.status,
              request.createdAt.toISOString().slice(0, 10),
            ])}
          />
        </Card>
      </div>
    </main>
  );
}
