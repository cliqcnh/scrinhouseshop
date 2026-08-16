/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { Smartphone, Wrench, Headphones, ArrowRight, ArrowLeftRight } from "lucide-react";
import { ProductCard } from "@/components/shared/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { HeroSlider } from "@/components/shared/hero-slider";
import { HeaderSearch } from "@/components/layout/header-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getFeaturedProducts,
  listTopLevelCategories,
  listHomeSlides,
} from "@/services/catalog-service";

import { getMarketState, getNextEventStart } from "@/actions/storefront/market-days";
import { MarketBanner } from "@/components/storefront/market-banner";

interface Props {
  searchParams: Promise<{ category?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const { category: activeCategorySlug } = await searchParams;

  const [topLevelCategories, slides, marketState] = await Promise.all([
    listTopLevelCategories(),
    listHomeSlides(),
    getMarketState(),
  ]);

  const defaultCategory = (topLevelCategories as any[]).find((c: any) => c.slug === "repair-parts") || topLevelCategories[0];
  const activeCategory = activeCategorySlug 
    ? (topLevelCategories as any[]).find((c: any) => c.slug === activeCategorySlug) || defaultCategory
    : defaultCategory;
  const activeCategoryId = activeCategory?.id;

  const featuredProducts = await getFeaturedProducts(8, activeCategoryId);
  const heroProduct = featuredProducts[0];

  let nextEventDate = null;
  if (!marketState.isLive && marketState.event) {
    nextEventDate = (await getNextEventStart(marketState.event.day, marketState.event.startTime)).toISOString();
  }

  return (
    <div className="bg-white">
      {/* ── Market Days Active Promo Banner ────────────────────────────── */}
      <MarketBanner
        isLive={marketState.isLive}
        nextEventDate={nextEventDate}
        eventTitle={marketState.event?.title || null}
      />

      {/* ── Hero Slider Banner ────────────────────────────────────────── */}
      <HeroSlider 
        slides={slides} 
        fallbackImage={heroProduct?.primaryImageUrl ?? null} 
        fallbackName={heroProduct?.name ?? "Product"} 
      />

      {/* ── Prominent Homepage Search Section ───────────────────────────── */}
      <div className="mx-auto max-w-4xl px-4 pt-12 pb-6 text-center">
        <h1 className="font-heading text-2xl font-extrabold text-foreground sm:text-3xl tracking-tight mb-6">
          Search ScrinHouse
        </h1>
        <div className="max-w-2xl mx-auto p-1.5 bg-muted/30 border border-border rounded-full shadow-sm">
          <HeaderSearch isMobile={true} />
        </div>
      </div>

      {/* ── Category Quick Links Grid ───────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {/* Card 1: Repair Parts */}
          <Link
            href="/category/repair-parts"
            className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-6 hover:shadow-md hover:border-primary/20 transition-all group flex flex-col justify-between h-40"
          >
            <div className="absolute right-4 bottom-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all">
              <Wrench className="size-24 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                Repair Parts
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                Screens, batteries, cameras &amp; charging ports.
              </p>
            </div>
            <span className="text-xs font-semibold text-primary inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Shop Parts <ArrowRight className="size-3.5" />
            </span>
          </Link>

          {/* Card 2: Phones & Consoles */}
          <Link
            href="/category/phones"
            className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-6 hover:shadow-md hover:border-primary/20 transition-all group flex flex-col justify-between h-40"
          >
            <div className="absolute right-4 bottom-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all">
              <Smartphone className="size-24 text-amber-600" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                Phones &amp; Consoles
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                Brand new and grade-A pre-owned devices.
              </p>
            </div>
            <span className="text-xs font-semibold text-primary inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Shop Phones <ArrowRight className="size-3.5" />
            </span>
          </Link>

          {/* Card 3: Accessories */}
          <Link
            href="/category/accessories"
            className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-green-500/5 to-emerald-500/5 p-6 hover:shadow-md hover:border-primary/20 transition-all group flex flex-col justify-between h-40"
          >
            <div className="absolute right-4 bottom-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all">
              <Headphones className="size-24 text-green-600" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                Accessories
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                Chargers, cases, screen protectors &amp; earphones.
              </p>
            </div>
            <span className="text-xs font-semibold text-primary inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Shop Accessories <ArrowRight className="size-3.5" />
            </span>
          </Link>
        </div>
      </section>

      {/* ── Quick Services Section ──────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border bg-muted/10 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="font-heading text-xl font-bold text-foreground">
              Swap your phone or book a repair
            </h3>
            <p className="text-sm text-muted-foreground max-w-xl">
              Get a quick swap value for your old device, or book a technician to fix your phone.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center md:justify-end shrink-0 w-full md:w-auto">
            <Link
              href="/trade-in"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-white hover:bg-muted text-foreground font-semibold px-5 text-sm shadow-sm transition-colors"
            >
              <ArrowLeftRight className="size-4" /> Trade-In &amp; Swap
            </Link>
            <Link
              href="/repairs"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary/95 text-white font-bold px-5 text-sm shadow-sm transition-colors"
            >
              <Wrench className="size-4" /> Book Repair
            </Link>
          </div>
        </div>
      </section>

      {/* ── New Arrivals ────────────────────────────────────────────── */}
      <section id="new-arrivals" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
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
                const order = ["repair-parts", "phones", "accessories"];
                return order.indexOf(a.slug) - order.indexOf(b.slug);
              })
              .slice(0, 3)
              .map((category: any) => {
                const isActive = category.slug === activeCategory?.slug;
                return (
                  <Link
                    key={category.id}
                    href={`/?category=${category.slug}#new-arrivals`}
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
