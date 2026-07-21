"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProductSummary } from "@/types/catalog";

export async function toggleWishlist(productId: string): Promise<{ success: boolean; isWishlisted?: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Please sign in to manage your wishlist." };
  }

  // Check if already in wishlist
  const { data: existing, error: checkError } = await supabase
    .from("wishlist_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (checkError) {
    return { success: false, error: checkError.message };
  }

  if (existing) {
    // Remove
    const { error: deleteError } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("id", existing.id);

    if (deleteError) return { success: false, error: deleteError.message };
    revalidatePath(`/products`);
    revalidatePath(`/account`);
    return { success: true, isWishlisted: false };
  } else {
    // Add
    const { error: insertError } = await supabase
      .from("wishlist_items")
      .insert({
        user_id: user.id,
        product_id: productId,
      });

    if (insertError) return { success: false, error: insertError.message };
    revalidatePath(`/products`);
    revalidatePath(`/account`);
    return { success: true, isWishlisted: true };
  }
}

export async function getWishlistProductIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("wishlist_items")
    .select("product_id")
    .eq("user_id", user.id);

  if (error) return [];
  return (data ?? []).map(item => item.product_id);
}

export async function getWishlistProducts(): Promise<ProductSummary[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Query wishlist items joining products
  const { data, error } = await supabase
    .from("wishlist_items")
    .select(`
      product_id,
      products (
        id,
        name,
        slug,
        product_type,
        condition,
        base_price,
        compare_at_price,
        avg_rating,
        review_count,
        is_featured,
        brands ( id, name, slug )
      )
    `)
    .eq("user_id", user.id);

  if (error || !data) return [];

  const productIds = data.map((item: any) => item.products?.id).filter(Boolean);
  if (productIds.length === 0) return [];

  // Fetch primary images
  const { data: images } = await supabase
    .from("product_images")
    .select("product_id, url")
    .in("product_id", productIds)
    .eq("is_primary", true);

  const imageMap = new Map((images ?? []).map((img) => [img.product_id, img.url]));

  // Check variant stock availability
  const { data: variants } = await supabase
    .from("product_variants")
    .select("product_id, stock_quantity")
    .in("product_id", productIds)
    .eq("is_active", true);

  const stockMap = new Map<string, number>();
  (variants ?? []).forEach((v) => {
    const cur = stockMap.get(v.product_id) ?? 0;
    stockMap.set(v.product_id, cur + v.stock_quantity);
  });

  return data
    .map((item: any) => {
      const p = item.products;
      if (!p) return null;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        productType: p.product_type,
        condition: p.condition,
        basePrice: p.base_price,
        compareAtPrice: p.compare_at_price,
        avgRating: p.avg_rating,
        reviewCount: p.review_count,
        isFeatured: p.is_featured,
        primaryImageUrl: imageMap.get(p.id) ?? null,
        brand: p.brands ? { id: p.brands.id, name: p.brands.name, slug: p.brands.slug, logoUrl: null } : null,
        inStock: (stockMap.get(p.id) ?? 0) > 0,
      };
    })
    .filter(Boolean) as ProductSummary[];
}
