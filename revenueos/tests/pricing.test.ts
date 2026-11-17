import { describe, expect, it } from "vitest";
import {
  assertAgreedPriceUnchanged,
  calculateQuotationTotals,
  resolveRegionalPrice,
} from "../lib/pricing";

const basePrice = {
  id: "price_1",
  productId: "product_1",
  currency: "EUR",
  unitAmount: 9900,
  priceBookVersion: "2026-11-base-v1",
};

const regionalPrices = [
  {
    priceId: "price_1",
    country: "IN",
    currency: "INR",
    unitAmount: 499900,
    priceBookVersion: "2026-11-base-v1",
    taxCode: "GST",
  },
  {
    priceId: "price_1",
    country: "GLOBAL",
    currency: "USD",
    unitAmount: 10900,
    priceBookVersion: "2026-11-base-v1",
    taxCode: null,
  },
];

describe("regional pricing", () => {
  it("prefers an exact country and currency match", () => {
    const resolved = resolveRegionalPrice({
      basePrice,
      regionalPrices,
      country: "IN",
      currency: "INR",
    });
    expect(resolved.matchedBy).toBe("REGION");
    expect(resolved.unitAmount).toBe(499900);
    expect(resolved.taxCode).toBe("GST");
  });

  it("falls back to a global price for the same currency", () => {
    const resolved = resolveRegionalPrice({
      basePrice,
      regionalPrices,
      country: "US",
      currency: "USD",
    });
    expect(resolved.matchedBy).toBe("CURRENCY");
    expect(resolved.unitAmount).toBe(10900);
  });

  it("uses the base price when currency already matches", () => {
    const resolved = resolveRegionalPrice({
      basePrice,
      regionalPrices,
      country: "DE",
      currency: "EUR",
    });
    expect(resolved.matchedBy).toBe("BASE");
    expect(resolved.unitAmount).toBe(9900);
  });

  it("converts with recorded FX metadata when no regional price exists", () => {
    const resolved = resolveRegionalPrice({
      basePrice,
      regionalPrices,
      country: "SG",
      currency: "SGD",
      exchangeRate: 1.44,
      fxSource: "manual",
    });
    expect(resolved.matchedBy).toBe("FX");
    expect(resolved.unitAmount).toBe(14256);
    expect(resolved.exchangeRate).toBe(1.44);
  });

  it("refuses silent currency conversion without a rate", () => {
    expect(() =>
      resolveRegionalPrice({ basePrice, regionalPrices, country: "SG", currency: "SGD" }),
    ).toThrow("No SGD price");
  });
});

describe("quotation totals", () => {
  it("applies discount before tax", () => {
    const totals = calculateQuotationTotals({
      items: [
        { quantity: 2, unitAmount: 10_000 },
        { quantity: 1, unitAmount: 5_000 },
      ],
      discountBps: 1000,
      taxRateBps: 1900,
      currency: "eur",
    });
    expect(totals.subtotal).toBe(25_000);
    expect(totals.discountAmount).toBe(2_500);
    expect(totals.taxAmount).toBe(4_275);
    expect(totals.total).toBe(26_775);
    expect(totals.currency).toBe("EUR");
  });

  it("detects changed agreed prices", () => {
    expect(() => assertAgreedPriceUnchanged(10_000, 10_001)).toThrow("agreed quotation price");
  });
});
