import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import type { ProductSummary } from "@/types/catalog";
import { discountPercent, formatPrice } from "@/utils/format";

export function ProductCard({ product }: { product: ProductSummary }) {
  const discount = discountPercent(product.basePrice, product.compareAtPrice);

  return (
    <Link href={`/products/${product.slug}`} className="group flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-[#f7f7f7]">
        {product.primaryImageUrl ? (
          <Image
            src={product.primaryImageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 45vw"
            className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-0 top-0 flex flex-col gap-px">
          {!product.inStock && (
            <span className="inline-flex items-center bg-[#222] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
              Sold Out
            </span>
          )}
          {product.inStock && discount && (
            <span className="inline-flex items-center bg-destructive px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
              Hot
            </span>
          )}
          {product.inStock && !discount && product.condition === "uk_used" && (
            <span className="inline-flex items-center border border-border bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground">
              UK Used
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 pt-3">
        {product.brand && (
          <span className="text-xs text-muted-foreground">{product.brand.name}</span>
        )}
        <h3 className="line-clamp-2 text-sm text-foreground">{product.name}</h3>

        {product.reviewCount > 0 && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`size-3 ${
                  i < Math.round(product.avgRating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-muted text-muted"
                }`}
              />
            ))}
            <span className="ml-1 text-xs text-muted-foreground">({product.reviewCount})</span>
          </div>
        )}

        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-bold text-primary">
            {formatPrice(product.basePrice)}
          </span>
          {product.compareAtPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
