import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ProductFiltersParsed } from "@/lib/validations/catalog";
import type {
  Category,
  PaginatedResult,
  ProductDetail,
  ProductSummary,
  HomeSlide,
} from "@/types/catalog";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  product_type: ProductSummary["productType"];
  condition: ProductSummary["condition"];
  base_price: number;
  compare_at_price: number | null;
  avg_rating: number;
  review_count: number;
  is_featured: boolean;
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  category: { id: string; parent_id: string | null; name: string; slug: string; description: string | null; image_url: string | null } | null;
  brand: { id: string; name: string; slug: string; logo_url: string | null } | null;
  product_images: { id: string; url: string; alt_text: string | null; is_primary: boolean; display_order: number }[];
  product_variants: {
    id: string;
    sku: string;
    storage: string | null;
    color: string | null;
    price: number;
    compare_at_price: number | null;
    stock_quantity: number;
    is_active: boolean;
  }[];
};

const PRODUCT_SELECT = `
  id, name, slug, description, product_type, condition, base_price, compare_at_price,
  avg_rating, review_count, is_featured, tags, seo_title, seo_description,
  category:categories!products_category_id_fkey ( id, parent_id, name, slug, description, image_url ),
  brand:brands ( id, name, slug, logo_url ),
  product_images ( id, url, alt_text, is_primary, display_order ),
  product_variants ( id, sku, storage, color, price, compare_at_price, stock_quantity, is_active )
`;

function toSummary(row: ProductRow): ProductSummary {
  const primaryImage =
    row.product_images.find((img) => img.is_primary) ??
    [...row.product_images].sort((a, b) => a.display_order - b.display_order)[0];

  const inStock = row.product_variants.some((v) => v.is_active && v.stock_quantity > 0);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    productType: row.product_type,
    condition: row.condition,
    basePrice: row.base_price,
    compareAtPrice: row.compare_at_price,
    avgRating: row.avg_rating,
    reviewCount: row.review_count,
    isFeatured: row.is_featured,
    primaryImageUrl: primaryImage?.url ?? null,
    brand: row.brand ? { id: row.brand.id, name: row.brand.name, slug: row.brand.slug, logoUrl: row.brand.logo_url } : null,
    inStock,
  };
}

function toDetail(row: ProductRow): ProductDetail {
  if (!row.category) {
    throw new Error(`Product ${row.id} is missing its category`);
  }

  return {
    ...toSummary(row),
    description: row.description,
    tags: row.tags,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    category: {
      id: row.category.id,
      parentId: row.category.parent_id,
      name: row.category.name,
      slug: row.category.slug,
      description: row.category.description,
      imageUrl: row.category.image_url,
    },
    images: [...row.product_images]
      .sort((a, b) => a.display_order - b.display_order)
      .map((img) => ({
        id: img.id,
        url: img.url,
        altText: img.alt_text,
        isPrimary: img.is_primary,
        displayOrder: img.display_order,
      })),
    variants: row.product_variants
      .filter((v) => v.is_active)
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        storage: v.storage,
        color: v.color,
        price: v.price,
        compareAtPrice: v.compare_at_price,
        stockQuantity: v.stock_quantity,
        isActive: v.is_active,
      })),
  };
}

async function getCategoryAndChildrenIds(supabase: any, categoryId: string): Promise<string[]> {
  const { data: children } = await supabase
    .from("categories")
    .select("id")
    .eq("parent_id", categoryId);

  const ids = [categoryId];
  if (children && children.length > 0) {
    ids.push(...children.map((c: any) => c.id));
  }
  return ids;
}

export async function listProducts(
  filters: ProductFiltersParsed,
): Promise<PaginatedResult<ProductSummary>> {
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .eq("is_active", true);

  if (filters.categorySlug) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.categorySlug)
      .maybeSingle();
    if (category) {
      const categoryIds = await getCategoryAndChildrenIds(supabase, category.id);
      query = query.in("category_id", categoryIds);
    }
  }

  if (filters.brandSlugs?.length) {
    const { data: brands } = await supabase
      .from("brands")
      .select("id")
      .in("slug", filters.brandSlugs);
    if (brands?.length) query = query.in("brand_id", brands.map((b) => b.id));
  }

  if (filters.productType) query = query.eq("product_type", filters.productType);
  if (filters.condition) query = query.eq("condition", filters.condition);
  if (filters.minPrice !== undefined) query = query.gte("base_price", filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte("base_price", filters.maxPrice);
  if (filters.query) query = query.ilike("name", `%${filters.query}%`);

  switch (filters.sort) {
    case "price_asc":
      query = query.order("base_price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("base_price", { ascending: false });
      break;
    case "rating":
      query = query.order("avg_rating", { ascending: false });
      break;
    case "popular":
      query = query.order("view_count", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const from = (filters.page - 1) * filters.perPage;
  const to = from + filters.perPage - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) throw new Error(`Failed to list products: ${error.message}`);

  const items = (data ?? []).map((row) => toSummary(row as unknown as ProductRow));
  const total = count ?? items.length;

  return {
    items,
    total,
    page: filters.page,
    perPage: filters.perPage,
    totalPages: Math.max(1, Math.ceil(total / filters.perPage)),
  };
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`Failed to load product "${slug}": ${error.message}`);
  if (!data) return null;

  return toDetail(data as unknown as ProductRow);
}

export async function getFeaturedProducts(limit = 8, categoryId?: string): Promise<ProductSummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("is_featured", true);

  if (categoryId) {
    const categoryIds = await getCategoryAndChildrenIds(supabase, categoryId);
    query = query.in("category_id", categoryIds);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to load featured products: ${error.message}`);
  
  const items = data ?? [];
  if (items.length > 0) {
    return items.map((row) => toSummary(row as unknown as ProductRow));
  }

  // Fallback: if no products are marked as 'is_featured = true', return the latest active products in this category
  let fallbackQuery = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true);

  if (categoryId) {
    const categoryIds = await getCategoryAndChildrenIds(supabase, categoryId);
    fallbackQuery = fallbackQuery.in("category_id", categoryIds);
  }

  const { data: fallbackData, error: fallbackError } = await fallbackQuery
    .order("created_at", { ascending: false })
    .limit(limit);

  if (fallbackError) throw new Error(`Failed to load fallback products: ${fallbackError.message}`);
  return (fallbackData ?? []).map((row) => toSummary(row as unknown as ProductRow));
}

export async function getRelatedProducts(product: ProductDetail, limit = 4): Promise<ProductSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("category_id", product.category.id)
    .neq("id", product.id)
    .limit(limit);

  if (error) throw new Error(`Failed to load related products: ${error.message}`);
  return (data ?? []).map((row) => toSummary(row as unknown as ProductRow));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, description, image_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`Failed to load category "${slug}": ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    parentId: data.parent_id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    imageUrl: data.image_url,
  };
}

export async function listBrands(): Promise<{ id: string; name: string; slug: string; logoUrl: string | null }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug, logo_url")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw new Error(`Failed to list brands: ${error.message}`);

  return (data ?? []).map((b) => ({ id: b.id, name: b.name, slug: b.slug, logoUrl: b.logo_url }));
}

export async function listTopLevelCategories(): Promise<Category[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, description, image_url")
    .is("parent_id", null)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw new Error(`Failed to list categories: ${error.message}`);

  return (data ?? []).map((c) => ({
    id: c.id,
    parentId: c.parent_id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.image_url,
  }));
}

export async function getCategoryTree(): Promise<(Category & { children: Category[] })[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, description, image_url")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw new Error(`Failed to load category tree: ${error.message}`);

  const rows = data ?? [];
  const byId = new Map(
    rows.map((c) => [
      c.id,
      {
        id: c.id,
        parentId: c.parent_id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.image_url,
        children: [] as Category[],
      },
    ]),
  );

  const roots: (Category & { children: Category[] })[] = [];
  for (const category of byId.values()) {
    if (category.parentId) {
      byId.get(category.parentId)?.children.push(category);
    } else {
      roots.push(category);
    }
  }
  return roots;
}

export async function listHomeSlides(): Promise<HomeSlide[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("home_slides")
    .select("id, image_url, title, subtitle, link_url, button_text, display_order, is_active")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw new Error(`Failed to list home slides: ${error.message}`);

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

