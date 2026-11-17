import { applyBps, fromMinorUnits, toMinorUnits } from "./money";

type BasePrice = {
  id: string;
  productId: string;
  currency: string;
  unitAmount: number;
  priceBookVersion: string;
};

type RegionalPriceRow = {
  priceId: string;
  country: string;
  currency: string;
  unitAmount: number;
  priceBookVersion: string;
  taxCode: string | null;
};

export type ResolvedPrice = {
  priceId: string;
  productId: string;
  currency: string;
  unitAmount: number;
  priceBookVersion: string;
  exchangeRate: number | null;
  fxSource: string | null;
  taxCode: string | null;
  matchedBy: "REGION" | "CURRENCY" | "BASE" | "FX";
};

export function resolveRegionalPrice(input: {
  basePrice: BasePrice;
  regionalPrices: RegionalPriceRow[];
  country: string;
  currency: string;
  exchangeRate?: number | null;
  fxSource?: string | null;
}): ResolvedPrice {
  const country = input.country.toUpperCase();
  const currency = input.currency.toUpperCase();

  const exact = input.regionalPrices.find(
    (row) => row.country.toUpperCase() === country && row.currency.toUpperCase() === currency,
  );
  if (exact) {
    return {
      priceId: input.basePrice.id,
      productId: input.basePrice.productId,
      currency,
      unitAmount: exact.unitAmount,
      priceBookVersion: exact.priceBookVersion,
      exchangeRate: null,
      fxSource: null,
      taxCode: exact.taxCode,
      matchedBy: "REGION",
    };
  }

  const sameCurrency = input.regionalPrices.find(
    (row) => row.currency.toUpperCase() === currency && row.country === "GLOBAL",
  );
  if (sameCurrency) {
    return {
      priceId: input.basePrice.id,
      productId: input.basePrice.productId,
      currency,
      unitAmount: sameCurrency.unitAmount,
      priceBookVersion: sameCurrency.priceBookVersion,
      exchangeRate: null,
      fxSource: null,
      taxCode: sameCurrency.taxCode,
      matchedBy: "CURRENCY",
    };
  }

  if (input.basePrice.currency.toUpperCase() === currency) {
    return {
      priceId: input.basePrice.id,
      productId: input.basePrice.productId,
      currency,
      unitAmount: input.basePrice.unitAmount,
      priceBookVersion: input.basePrice.priceBookVersion,
      exchangeRate: null,
      fxSource: null,
      taxCode: null,
      matchedBy: "BASE",
    };
  }

  if (input.exchangeRate && Number.isFinite(input.exchangeRate) && input.exchangeRate > 0) {
    const converted = toMinorUnits(
      Number(fromMinorUnits(input.basePrice.unitAmount, input.basePrice.currency)) * input.exchangeRate,
      currency,
    );
    return {
      priceId: input.basePrice.id,
      productId: input.basePrice.productId,
      currency,
      unitAmount: converted,
      priceBookVersion: input.basePrice.priceBookVersion,
      exchangeRate: input.exchangeRate,
      fxSource: input.fxSource ?? "manual",
      taxCode: null,
      matchedBy: "FX",
    };
  }

  throw new Error(`No ${currency} price is configured for ${input.basePrice.productId}`);
}

export function assertAgreedPriceUnchanged(agreedMinor: number, currentMinor: number) {
  if (agreedMinor !== currentMinor) {
    throw new Error("The agreed quotation price differs from the current catalogue price");
  }
}

export function calculateQuotationTotals(input: {
  items: { quantity: number; unitAmount: number }[];
  discountBps?: number;
  taxRateBps?: number;
  currency: string;
}) {
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitAmount, 0);
  const discountAmount = applyBps(subtotal, input.discountBps ?? 0);
  const taxable = subtotal - discountAmount;
  const taxAmount = applyBps(taxable, input.taxRateBps ?? 0);
  return {
    subtotal,
    discountAmount,
    taxAmount,
    total: taxable + taxAmount,
    currency: input.currency.toUpperCase(),
  };
}
