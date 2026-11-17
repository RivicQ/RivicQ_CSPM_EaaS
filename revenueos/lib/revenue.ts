import { applyBps, toMinorUnits } from "./money";

export type RevenueCategory = "RECURRING" | "ONE_TIME" | "REFUND" | "COMMISSION" | "COST";
export type RevenueKind = "CONTRACTED" | "INVOICED" | "COLLECTED" | "FORECAST";
export type RevenueInterval = "MONTHLY" | "ANNUAL" | "ONE_TIME";
export type Scenario = "CONSERVATIVE" | "BASE" | "AGGRESSIVE";

export type RevenueInput = {
  category: RevenueCategory;
  kind: RevenueKind;
  amount: number;
  currency: string;
  interval?: RevenueInterval;
};

export function asRevenueInterval(
  interval?: string | null,
): RevenueInterval | undefined {
  if (interval === "MONTHLY" || interval === "ANNUAL" || interval === "ONE_TIME") {
    return interval;
  }
  return undefined;
}

export type CurrencySummary = {
  currency: string;
  mrr: number;
  arr: number;
  oneTimeRevenue: number;
  contracted: number;
  invoiced: number;
  collected: number;
  refunds: number;
  commissions: number;
  costs: number;
  outstanding: number;
  grossMargin: number;
  forecast: number;
};

function emptySummary(currency: string): CurrencySummary {
  return {
    currency,
    mrr: 0,
    arr: 0,
    oneTimeRevenue: 0,
    contracted: 0,
    invoiced: 0,
    collected: 0,
    refunds: 0,
    commissions: 0,
    costs: 0,
    outstanding: 0,
    grossMargin: 0,
    forecast: 0,
  };
}

export function summarizeRevenue(records: RevenueInput[]): Record<string, CurrencySummary> {
  const result: Record<string, CurrencySummary> = {};

  for (const record of records) {
    const currency = record.currency.toUpperCase();
    const summary = result[currency] ?? (result[currency] = emptySummary(currency));

    if (record.kind === "FORECAST") {
      summary.forecast += record.amount;
      continue;
    }

    if (record.kind === "CONTRACTED") summary.contracted += record.amount;
    if (record.kind === "INVOICED") summary.invoiced += record.amount;
    if (record.kind === "COLLECTED" && record.category !== "REFUND") {
      summary.collected += record.amount;
    }

    if (record.category === "RECURRING") {
      const interval = record.interval ?? "MONTHLY";
      if (interval === "MONTHLY") {
        summary.mrr += record.amount;
        summary.arr += record.amount * 12;
      } else if (interval === "ANNUAL") {
        summary.mrr += Math.round(record.amount / 12);
        summary.arr += record.amount;
      }
    }

    if (record.category === "ONE_TIME") summary.oneTimeRevenue += record.amount;
    if (record.category === "REFUND") summary.refunds += record.amount;
    if (record.category === "COMMISSION") summary.commissions += record.amount;
    if (record.category === "COST") summary.costs += record.amount;
  }

  for (const summary of Object.values(result)) {
    summary.outstanding = summary.invoiced - summary.collected;
    summary.grossMargin = summary.collected - summary.refunds - summary.commissions - summary.costs;
  }

  return result;
}

export const firstTenCustomerPlan = {
  customers: [
    { region: "Germany", count: 3, packages: ["Startup", "Growth", "Professional"] },
    { region: "Wider Europe", count: 2, packages: ["Growth", "Professional"] },
    { region: "India", count: 2, packages: ["Growth", "Professional"] },
    { region: "Singapore", count: 1, packages: ["Growth"] },
    { region: "Japan", count: 1, packages: ["Growth"] },
    { region: "Australia", count: 1, packages: ["Growth"] },
  ],
  targets: {
    EUR: {
      saasArr: toMinorUnits("49104", "EUR"),
      auditRevenue: toMinorUnits("42500", "EUR"),
      combined: toMinorUnits("91604", "EUR"),
    },
    INR: {
      saasArr: toMinorUnits("839976", "INR"),
      auditRevenue: toMinorUnits("650000", "INR"),
      combined: toMinorUnits("1489976", "INR"),
    },
  },
};

export function projectFinancials(input: {
  scenario: Scenario;
  customerCount: 10 | 25 | 50;
  currency: "EUR" | "INR";
}) {
  const multipliers: Record<Scenario, number> = {
    CONSERVATIVE: 0.8,
    BASE: 1,
    AGGRESSIVE: 1.25,
  };
  const target = firstTenCustomerPlan.targets[input.currency].combined;
  const projection = Math.round((target * multipliers[input.scenario] * input.customerCount) / 10);
  return {
    scenario: input.scenario,
    customerCount: input.customerCount,
    currency: input.currency,
    projectedRevenue: projection,
    basis: "FORECAST",
  };
}

export function partnerCommissionAmount(amount: number, rateBps: number) {
  return applyBps(amount, rateBps);
}
