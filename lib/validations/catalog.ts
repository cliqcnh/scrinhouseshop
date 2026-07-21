import { z } from "zod";

export const productSortSchema = z
  .enum(["newest", "price_asc", "price_desc", "rating", "popular"])
  .default("newest");

export const productFiltersSchema = z.object({
  categorySlug: z.string().trim().min(1).optional(),
  brandSlugs: z.array(z.string().trim().min(1)).optional(),
  productType: z.enum(["phone", "accessory", "repair_part"]).optional(),
  condition: z.enum(["brand_new", "uk_used"]).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  query: z.string().trim().max(120).optional(),
  sort: productSortSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(48).default(24),
});

export type ProductFiltersInput = z.input<typeof productFiltersSchema>;
export type ProductFiltersParsed = z.output<typeof productFiltersSchema>;

/**
 * Parses a Next.js `searchParams` object (string | string[] | undefined
 * values) into a validated ProductFiltersParsed. Invalid/unknown values are
 * dropped rather than throwing, since search params are user-editable URL
 * state and should degrade gracefully.
 */
export function parseProductSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): ProductFiltersParsed {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const list = (v: string | string[] | undefined) =>
    v === undefined ? undefined : Array.isArray(v) ? v : [v];

  const result = productFiltersSchema.safeParse({
    categorySlug: first(searchParams.category),
    brandSlugs: list(searchParams.brand),
    productType: first(searchParams.type),
    condition: first(searchParams.condition),
    minPrice: first(searchParams.minPrice),
    maxPrice: first(searchParams.maxPrice),
    query: first(searchParams.q),
    sort: first(searchParams.sort),
    page: first(searchParams.page),
    perPage: first(searchParams.perPage),
  });

  if (result.success) return result.data;

  // Fall back to defaults for the fields that failed, rather than a 500.
  return productFiltersSchema.parse({});
}
