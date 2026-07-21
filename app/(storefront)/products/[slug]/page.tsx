import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/shared/product-card";
import { ProductGallery } from "@/components/shared/product-gallery";
import { AddToCartPanel } from "@/features/catalog/components/add-to-cart-panel";
import { discountPercent, formatPrice } from "@/utils/format";
import { getProductBySlug, getRelatedProducts } from "@/services/catalog-service";
import { getWishlistProductIds } from "@/actions/storefront/wishlist";
import { getInstallmentConfig } from "@/actions/admin/installments";
import { listProductReviews } from "@/actions/storefront/reviews";
import { ProductReviews } from "@/components/storefront/product-reviews";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.description ?? undefined,
    openGraph: product.images[0] ? { images: [product.images[0].url] } : undefined,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [relatedProducts, wishlistProductIds, installmentConfig, reviews] = await Promise.all([
    getRelatedProducts(product),
    getWishlistProductIds(),
    getInstallmentConfig(),
    listProductReviews(product.id),
  ]);

  const isWishlisted = wishlistProductIds.includes(product.id);
  const discount = discountPercent(product.basePrice, product.compareAtPrice);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <span>/</span>
        <Link href={`/category/${product.category.slug}`} className="hover:text-foreground">
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          {product.brand && (
            <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {product.brand.name}
            </span>
          )}
          <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">{product.name}</h1>

          <div className="mt-3 flex items-center gap-3">
            {product.reviewCount > 0 && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="size-4 fill-foreground text-foreground" />
                <span className="font-medium text-foreground">{product.avgRating.toFixed(1)}</span>
                <span>({product.reviewCount} reviews)</span>
              </div>
            )}
            {product.condition === "uk_used" && <Badge variant="secondary">UK Used</Badge>}
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-foreground">
              {formatPrice(product.basePrice)}
            </span>
            {product.compareAtPrice && (
              <span className="text-lg text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
            {discount && (
              <span className="text-sm font-medium text-muted-foreground">Save {discount}%</span>
            )}
          </div>

          <AddToCartPanel product={product} initialWishlistState={isWishlisted} installmentConfig={installmentConfig} />

          {product.description && (
            <div className="mt-8 border-t border-border pt-6">
              <h2 className="text-sm font-semibold text-foreground">Description</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </div>
          )}

          {product.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <ProductReviews productId={product.id} initialReviews={reviews} />

      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-semibold text-foreground">You may also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {relatedProducts.map((related) => (
              <ProductCard key={related.id} product={related} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
