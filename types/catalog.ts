import type { ProductCondition, ProductType } from "@/types/database";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  displayOrder: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  storage: string | null;
  color: string | null;
  price: number;
  compareAtPrice: number | null;
  stockQuantity: number;
  isActive: boolean;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  productType: ProductType;
  condition: ProductCondition | null;
  basePrice: number;
  compareAtPrice: number | null;
  avgRating: number;
  reviewCount: number;
  isFeatured: boolean;
  primaryImageUrl: string | null;
  brand: Brand | null;
  inStock: boolean;
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  tags: string[];
  category: Category;
  images: ProductImage[];
  variants: ProductVariant[];
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface ProductFilters {
  categorySlug?: string;
  brandSlugs?: string[];
  productType?: ProductType;
  condition?: ProductCondition;
  minPrice?: number;
  maxPrice?: number;
  query?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "rating" | "popular";
  page?: number;
  perPage?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface HomeSlide {
  id: string;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  linkUrl: string;
  buttonText: string;
  displayOrder: number;
  isActive: boolean;
}

