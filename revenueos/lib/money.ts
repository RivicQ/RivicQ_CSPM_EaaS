const ZERO_DECIMAL_CURRENCIES = new Set(["JPY"]);

export function currencyDecimals(currency: string) {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
}

export function toMinorUnits(value: number | string, currency: string): number {
  const decimals = currencyDecimals(currency);
  const text = typeof value === "number" ? value.toString() : value.trim();
  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const parts = unsigned.split(".");

  if (parts.length > 2 || !/^\d+$/.test(parts[0]) || (parts[1] && !/^\d+$/.test(parts[1]))) {
    throw new Error(`Invalid monetary amount: ${text}`);
  }

  const fraction = parts[1] ?? "";
  const scale = 10n ** BigInt(decimals);
  const digits = (fraction + "0".repeat(decimals)).slice(0, decimals);
  let minor = BigInt(parts[0]) * scale + BigInt(digits || "0");

  if (fraction.length > decimals && Number(fraction[decimals]) >= 5) {
    minor += 1n;
  }
  if (negative) minor = -minor;

  const result = Number(minor);
  if (!Number.isSafeInteger(result)) {
    throw new Error(`Monetary amount is too large: ${text}`);
  }
  return result;
}

export function fromMinorUnits(minor: number, currency: string): string {
  if (!Number.isSafeInteger(minor)) {
    throw new Error("Minor unit amount must be a safe integer");
  }
  const decimals = currencyDecimals(currency);
  const negative = minor < 0;
  const absolute = Math.abs(minor).toString().padStart(decimals + 1, "0");
  if (decimals === 0) return `${negative ? "-" : ""}${absolute}`;
  const whole = absolute.slice(0, -decimals);
  const fraction = absolute.slice(-decimals);
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export function formatMoney(minor: number, currency: string, locale = "en-GB") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: currencyDecimals(currency),
    maximumFractionDigits: currencyDecimals(currency),
  }).format(Number(fromMinorUnits(minor, currency)));
}

export function applyBps(amount: number, basisPoints: number) {
  if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(basisPoints)) {
    throw new Error("Basis-point calculations require integer inputs");
  }
  return Math.round((amount * basisPoints) / 10_000);
}
