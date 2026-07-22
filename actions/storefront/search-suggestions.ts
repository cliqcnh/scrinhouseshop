"use server";

import { createClient } from "@/lib/supabase/server";

export interface ProductSuggestion {
  id: string;
  name: string;
  slug: string;
  primaryImageUrl: string | null;
  basePrice: number;
}

export async function getProductSuggestions(query: string): Promise<ProductSuggestion[]> {
  if (!query || query.trim().length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(`
      id, name, slug, base_price,
      product_images ( url, is_primary )
    `)
    .ilike("name", `%${query.trim()}%`)
    .eq("is_active", true)
    .limit(5);

  if (error) {
    console.error("Failed to fetch product suggestions:", error.message);
    return [];
  }

  return (data ?? []).map((row: any) => {
    const images = row.product_images ?? [];
    const primaryImage = images.find((img: any) => img.is_primary)?.url ?? images[0]?.url ?? null;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      primaryImageUrl: primaryImage,
      basePrice: Number(row.base_price),
    };
  });
}
