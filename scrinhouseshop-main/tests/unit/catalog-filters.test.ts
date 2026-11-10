import { describe, expect, it } from "vitest";
import { parseProductSearchParams } from "@/lib/validations/catalog";

describe("parseProductSearchParams", () => {
  it("applies defaults when no params are given", () => {
    const result = parseProductSearchParams({});
    expect(result).toMatchObject({ page: 1, perPage: 24, sort: "newest" });
  });

  it("parses single-value params", () => {
    const result = parseProductSearchParams({
      category: "phones",
      type: "phone",
      condition: "uk_used",
      q: "iphone",
      sort: "price_asc",
      page: "2",
      minPrice: "100",
      maxPrice: "5000",
    });

    expect(result).toMatchObject({
      categorySlug: "phones",
      productType: "phone",
      condition: "uk_used",
      query: "iphone",
      sort: "price_asc",
      page: 2,
      minPrice: 100,
      maxPrice: 5000,
    });
  });

  it("collects repeated brand params into an array", () => {
    const result = parseProductSearchParams({ brand: ["apple", "samsung"] });
    expect(result.brandSlugs).toEqual(["apple", "samsung"]);
  });

  it("wraps a single brand param into an array", () => {
    const result = parseProductSearchParams({ brand: "apple" });
    expect(result.brandSlugs).toEqual(["apple"]);
  });

  it("falls back to defaults instead of throwing on invalid values", () => {
    const result = parseProductSearchParams({ page: "not-a-number", type: "invalid" });
    expect(result.page).toBe(1);
  });
});
