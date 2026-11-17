import { describe, expect, it } from "vitest";
import { applyBps, currencyDecimals, formatMoney, fromMinorUnits, toMinorUnits } from "../lib/money";

describe("money", () => {
  it("converts decimal amounts to integer minor units", () => {
    expect(toMinorUnits("10.99", "EUR")).toBe(1099);
    expect(toMinorUnits(10.99, "EUR")).toBe(1099);
    expect(toMinorUnits("10.995", "EUR")).toBe(1100);
  });

  it("handles zero-decimal currencies", () => {
    expect(currencyDecimals("JPY")).toBe(0);
    expect(toMinorUnits("1234", "JPY")).toBe(1234);
    expect(fromMinorUnits(1234, "JPY")).toBe("1234");
  });

  it("formats and preserves negative amounts", () => {
    expect(fromMinorUnits(-1099, "EUR")).toBe("-10.99");
    expect(formatMoney(1099, "EUR")).toBe("€10.99");
  });

  it("applies basis points with integer rounding", () => {
    expect(applyBps(10_000, 1500)).toBe(1500);
    expect(applyBps(999, 1000)).toBe(100);
  });

  it("rejects invalid monetary text", () => {
    expect(() => toMinorUnits("10.99.1", "EUR")).toThrow("Invalid monetary amount");
  });
});
