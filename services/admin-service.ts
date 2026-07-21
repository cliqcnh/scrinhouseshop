import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ProductFormValues } from "@/lib/validations/admin-product";
import type { ProductImage } from "@/types/catalog";

export interface AdminDashboardStats {
  totalProducts: number;
  activeProducts: number;
  totalCategories: number;
  totalBrands: number;
  lowStockVariants: number;
  outOfStockVariants: number;
  totalReviews: number;
  totalOrders: number;
  pendingOrders: number;
  totalSales: number;
  activeRepairs: number;
}

export async function getDashboardStats(): Promise<AdminDashboardStats> {
  const supabase = await createClient();

  const [products, activeProducts, categories, brands, variants, reviews, orders, repairs] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("brands").select("id", { count: "exact", head: true }),
    supabase.from("product_variants").select("stock_quantity, low_stock_threshold").eq("is_active", true),
    supabase.from("reviews").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("total, status"),
    supabase.from("repair_bookings").select("status"),
  ]);

  const variantRows = variants.data ?? [];
  const lowStockVariants = variantRows.filter(
    (v) => v.stock_quantity > 0 && v.stock_quantity <= v.low_stock_threshold,
  ).length;
  const outOfStockVariants = variantRows.filter((v) => v.stock_quantity === 0).length;

  const orderRows = orders.data ?? [];
  const repairRows = repairs.data ?? [];

  const totalOrders = orderRows.length;
  const pendingOrders = orderRows.filter(
    (o) => o.status === "paid" || o.status === "processing" || o.status === "shipped"
  ).length;

  const totalSales = orderRows
    .filter((o) => o.status !== "pending_payment" && o.status !== "cancelled" && o.status !== "refunded")
    .reduce((sum, o) => sum + Number(o.total), 0);

  const activeRepairs = repairRows.filter(
    (r) => r.status === "pending" || r.status === "processing" || r.status === "repairing"
  ).length;

  return {
    totalProducts: products.count ?? 0,
    activeProducts: activeProducts.count ?? 0,
    totalCategories: categories.count ?? 0,
    totalBrands: brands.count ?? 0,
    lowStockVariants,
    outOfStockVariants,
    totalReviews: reviews.count ?? 0,
    totalOrders,
    pendingOrders,
    totalSales,
    activeRepairs,
  };
}

export interface AdminProductRow {
  id: string;
  name: string;
  sku: string;
  productType: string;
  basePrice: number;
  isActive: boolean;
  isFeatured: boolean;
  categoryName: string | null;
  brandName: string | null;
  primaryImageUrl: string | null;
  totalStock: number;
  updatedAt: string;
}

interface RawAdminProductRow {
  id: string;
  name: string;
  sku: string;
  product_type: string;
  base_price: number;
  is_active: boolean;
  is_featured: boolean;
  updated_at: string;
  category: { name: string } | null;
  brand: { name: string } | null;
  product_images: { url: string; is_primary: boolean }[];
  product_variants: { stock_quantity: number }[];
}

export async function listAdminProducts(query?: string): Promise<AdminProductRow[]> {
  const supabase = await createClient();

  let request = supabase
    .from("products")
    .select<string, RawAdminProductRow>(
      `id, name, sku, product_type, base_price, is_active, is_featured, updated_at,
       category:categories!products_category_id_fkey ( name ),
       brand:brands ( name ),
       product_images ( url, is_primary ),
       product_variants ( stock_quantity )`,
    )
    .order("updated_at", { ascending: false });

  if (query) request = request.ilike("name", `%${query}%`);

  const { data, error } = await request;
  if (error) throw new Error(`Failed to list admin products: ${error.message}`);

  return (data ?? []).map((row) => {
    const images = row.product_images;
    const variants = row.product_variants;
    const category = row.category;
    const brand = row.brand;

    return {
      id: row.id,
      name: row.name,
      sku: row.sku,
      productType: row.product_type,
      basePrice: row.base_price,
      isActive: row.is_active,
      isFeatured: row.is_featured,
      categoryName: category?.name ?? null,
      brandName: brand?.name ?? null,
      primaryImageUrl: images.find((i) => i.is_primary)?.url ?? images[0]?.url ?? null,
      totalStock: variants.reduce((sum, v) => sum + v.stock_quantity, 0),
      updatedAt: row.updated_at,
    };
  });
}

export interface AdminProductDetail {
  formValues: ProductFormValues;
  images: ProductImage[];
}

interface RawAdminProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  product_type: "phone" | "accessory" | "repair_part";
  condition: "brand_new" | "uk_used" | null;
  base_price: number;
  compare_at_price: number | null;
  is_featured: boolean;
  is_active: boolean;
  tags: string[];
  sku: string;
  category_id: string;
  brand_id: string | null;
  product_images: { id: string; url: string; alt_text: string | null; is_primary: boolean; display_order: number }[];
  product_variants: {
    id: string; sku: string; storage: string | null; color: string | null; price: number;
    stock_quantity: number; is_active: boolean;
  }[];
}

export async function getAdminProductById(id: string): Promise<AdminProductDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select<string, RawAdminProductDetail>(
      `id, name, slug, description, product_type, condition, base_price, compare_at_price,
       is_featured, is_active, tags, sku, category_id, brand_id,
       product_images ( id, url, alt_text, is_primary, display_order ),
       product_variants ( id, sku, storage, color, price, stock_quantity, is_active )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load product: ${error.message}`);
  if (!data) return null;

  const images = data.product_images;
  const variants = data.product_variants;

  return {
    formValues: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description ?? "",
      categoryId: data.category_id,
      brandId: data.brand_id ?? "",
      productType: data.product_type,
      condition: data.condition ?? "",
      sku: data.sku,
      basePrice: data.base_price,
      compareAtPrice: data.compare_at_price ?? undefined,
      tags: data.tags.join(", "),
      isFeatured: data.is_featured,
      isActive: data.is_active,
      variants: variants
        .filter((v) => v.is_active)
        .map((v) => ({
          id: v.id,
          sku: v.sku,
          storage: v.storage ?? "",
          color: v.color ?? "",
          price: v.price,
          stockQuantity: v.stock_quantity,
        })),
    },
    images: [...images]
      .sort((a, b) => a.display_order - b.display_order)
      .map((i) => ({ id: i.id, url: i.url, altText: i.alt_text, isPrimary: i.is_primary, displayOrder: i.display_order })),
  };
}

export async function listAllCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, is_active")
    .order("display_order", { ascending: true });

  if (error) throw new Error(`Failed to list categories: ${error.message}`);
  return (data ?? []).map((c) => ({
    id: c.id,
    parentId: c.parent_id,
    name: c.name,
    slug: c.slug,
    isActive: c.is_active,
  }));
}

export async function listAllBrands() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug, is_active")
    .order("name", { ascending: true });

  if (error) throw new Error(`Failed to list brands: ${error.message}`);
  return (data ?? []).map((b) => ({ id: b.id, name: b.name, slug: b.slug, isActive: b.is_active }));
}

export async function listAllSlidesAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("home_slides")
    .select("id, image_url, title, subtitle, link_url, button_text, display_order, is_active")
    .order("display_order", { ascending: true });

  if (error) throw new Error(`Failed to list slides: ${error.message}`);
  return (data ?? []).map((s) => ({
    id: s.id,
    imageUrl: s.image_url,
    title: s.title,
    subtitle: s.subtitle,
    linkUrl: s.link_url,
    buttonText: s.button_text,
    displayOrder: s.display_order,
    isActive: s.is_active,
  }));
}

