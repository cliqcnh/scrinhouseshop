import { describe, expect, it } from "vitest";
import { discountPercent, formatPrice } from "@/utils/format";

describe("formatPrice", () => {
  it("formats a whole number amount as Ghanaian cedis", () => {
    expect(formatPrice(8999)).toBe("GH₵8,999.00");
  });

  it("formats decimal amounts with two fraction digits", () => {
    expect(formatPrice(39.5)).toBe("GH₵39.50");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("GH₵0.00");
  });
});

describe("discountPercent", () => {
  it("returns null when there is no compare-at price", () => {
    expect(discountPercent(100, null)).toBeNull();
  });

  it("returns null when compare-at price is not higher than the base price", () => {
    expect(discountPercent(100, 100)).toBeNull();
    expect(discountPercent(100, 90)).toBeNull();
  });

  it("returns the rounded percentage discount", () => {
    expect(discountPercent(75, 100)).toBe(25);
    expect(discountPercent(8999, 9999)).toBe(10);
  });
});
