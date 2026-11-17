import { handleRoute, ok } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { asRevenueInterval, firstTenCustomerPlan, projectFinancials, summarizeRevenue } from "@/lib/revenue";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleRoute(async () => {
    await requireStaff(["SUPER_ADMIN", "FOUNDER", "FINANCE_ADMIN"]);
    const records = await prisma.revenueRecord.findMany({
      orderBy: { periodStart: "desc" },
      take: 5000,
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

    const url = new URL(request.url);
    const scenarioValues = ["CONSERVATIVE", "BASE", "AGGRESSIVE"];
    const currencyValues = ["EUR", "INR"];
    const scenarioParam = url.searchParams.get("scenario") ?? "BASE";
    const currencyParam = url.searchParams.get("currency") ?? "EUR";
    const scenario = scenarioValues.includes(scenarioParam) ? scenarioParam : "BASE";
    const currency = currencyValues.includes(currencyParam) ? currencyParam : "EUR";
    const countParam = Number(url.searchParams.get("customers") ?? "10");
    const customerCount = countParam === 25 || countParam === 50 ? countParam : 10;

    return ok({
      summary,
      plan: firstTenCustomerPlan,
      projection: projectFinancials({
        scenario: scenario as "CONSERVATIVE" | "BASE" | "AGGRESSIVE",
        customerCount,
        currency: currency as "EUR" | "INR",
      }),
      actualVsForecastNote: "Forecast records are planning targets and are never counted as collected revenue.",
    });
  });
}
