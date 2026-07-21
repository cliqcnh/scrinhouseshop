/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { Smartphone } from "lucide-react";
import { ProductCard } from "@/components/shared/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { HeroSlider } from "@/components/shared/hero-slider";
import {
  getFeaturedProducts,
  listTopLevelCategories,
  listHomeSlides,
} from "@/services/catalog-service";

interface Props {
  searchParams: Promise<{ category?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const { category: activeCategorySlug } = await searchParams;

  const [topLevelCategories, slides] = await Promise.all([
    listTopLevelCategories(),
    listHomeSlides(),
  ]);

  const activeCategory = (topLevelCategories as any[]).find((c: any) => c.slug === activeCategorySlug) || topLevelCategories[0];
  const activeCategoryId = activeCategory?.id;

  const featuredProducts = await getFeaturedProducts(8, activeCategoryId);
  const heroProduct = featuredProducts[0];

  return (
    <div className="bg-white">
      {/* ── Hero Slider Banner ────────────────────────────────────────── */}
      <HeroSlider 
        slides={slides} 
        fallbackImage={heroProduct?.primaryImageUrl ?? null} 
        fallbackName={heroProduct?.name ?? "Product"} 
      />

      {/* ── New Arrivals ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Just landed in store
          </p>
          <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
            New Arrivals
          </h2>
          <p className="text-sm text-muted-foreground">
            Fresh phones, accessories and repair parts — straight from our latest stock
          </p>

          {/* Tab filters */}
          <div className="mt-3 flex gap-6 border-b border-border">
            {(topLevelCategories as any[])
              .filter((c: any) => ["phones", "repair-parts", "accessories"].includes(c.slug))
              .sort((a: any, b: any) => {
                const order = ["phones", "repair-parts", "accessories"];
                return order.indexOf(a.slug) - order.indexOf(b.slug);
              })
              .slice(0, 3)
              .map((category: any) => {
                const isActive = category.slug === activeCategory?.slug;
                return (
                  <Link
                    key={category.id}
                    href={`/?category=${category.slug}`}
                    scroll={false}
                    className={`pb-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
                      isActive
                        ? "border-b-2 border-foreground text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {category.name}
                  </Link>
                );
              })}
          </div>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Smartphone}
            title="No featured products yet"
            description="We'll update this section with featured items soon. Please check back later."
            className="mt-8"
          />
        )}
      </section>
    </div>
  );
}
