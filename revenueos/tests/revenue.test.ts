import { describe, expect, it } from "vitest";
import {
  firstTenCustomerPlan,
  partnerCommissionAmount,
  projectFinancials,
  summarizeRevenue,
} from "../lib/revenue";
import { toMinorUnits } from "../lib/money";

describe("revenue summary", () => {
  it("normalizes monthly and annual recurring revenue", () => {
    const summary = summarizeRevenue([
      {
        category: "RECURRING",
        kind: "COLLECTED",
        amount: 100_00,
        currency: "EUR",
        interval: "MONTHLY",
      },
      {
        category: "RECURRING",
        kind: "COLLECTED",
        amount: 120_00 * 12,
        currency: "EUR",
        interval: "ANNUAL",
      },
    ]);
    expect(summary.EUR.mrr).toBe(220_00);
    expect(summary.EUR.arr).toBe(264_000);
  });

  it("never treats forecasts as collected revenue", () => {
    const summary = summarizeRevenue([
      {
        category: "ONE_TIME",
        kind: "FORECAST",
        amount: toMinorUnits("42500", "EUR"),
        currency: "EUR",
      },
    ]);
    expect(summary.EUR.forecast).toBe(4_250_000);
    expect(summary.EUR.collected).toBe(0);
    expect(summary.EUR.outstanding).toBe(0);
  });

  it("calculates margin and outstanding amounts", () => {
    const summary = summarizeRevenue([
      { category: "ONE_TIME", kind: "INVOICED", amount: 50_000, currency: "EUR" },
      { category: "ONE_TIME", kind: "COLLECTED", amount: 30_000, currency: "EUR" },
      { category: "REFUND", kind: "COLLECTED", amount: 2_000, currency: "EUR" },
      { category: "COST", kind: "CONTRACTED", amount: 5_000, currency: "EUR" },
      { category: "COMMISSION", kind: "CONTRACTED", amount: 3_000, currency: "EUR" },
    ]);
    expect(summary.EUR.outstanding).toBe(20_000);
    expect(summary.EUR.grossMargin).toBe(20_000);
  });
});

describe("first ten customer plan", () => {
  it("holds the EUR and INR targets", () => {
    expect(firstTenCustomerPlan.targets.EUR.combined).toBe(toMinorUnits("91604", "EUR"));
    expect(firstTenCustomerPlan.targets.INR.combined).toBe(toMinorUnits("1489976", "INR"));
  });

  it("projects scenarios from the base target", () => {
    const base = projectFinancials({
      scenario: "BASE",
      customerCount: 10,
      currency: "EUR",
    });
    const aggressive = projectFinancials({
      scenario: "AGGRESSIVE",
      customerCount: 10,
      currency: "EUR",
    });
    expect(base.projectedRevenue).toBe(toMinorUnits("91604", "EUR"));
    expect(aggressive.projectedRevenue).toBe(toMinorUnits("114505", "EUR"));
  });

  it("calculates partner commission", () => {
    expect(partnerCommissionAmount(100_000, 1500)).toBe(15_000);
  });
});
