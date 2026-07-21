import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageSearch } from "lucide-react";
import { ProductCard } from "@/components/shared/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { FilterSheet } from "@/components/shared/filter-sheet";
import { ProductSortSelect } from "@/components/shared/product-filters";
import { parseProductSearchParams } from "@/lib/validations/catalog";
import { getCategoryBySlug, listBrands, listProducts } from "@/services/catalog-service";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  return {
    title: category.name,
    description: category.description ?? `Shop ${category.name} at ScrinHouse.`,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const rawSearchParams = await searchParams;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const filters = parseProductSearchParams({ ...rawSearchParams, category: slug });
  const [{ items, page, totalPages }, brands] = await Promise.all([
    listProducts(filters),
    listBrands(),
  ]);

  const activeFilterCount = (filters.brandSlugs?.length ?? 0) + (filters.condition ? 1 : 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground sm:text-4xl">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{category.description}</p>
          )}
        </div>
        <nav aria-label="Breadcrumb" className="hidden shrink-0 items-center gap-1.5 text-sm text-muted-foreground sm:flex">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <span className="text-foreground">{category.name}</span>
        </nav>
      </div>

      <div className="mt-8 flex items-center justify-between border-y border-border py-3">
        <FilterSheet
          brands={brands}
          selectedBrandSlugs={filters.brandSlugs ?? []}
          selectedCondition={filters.condition}
          activeCount={activeFilterCount}
        />
        <div className="flex items-center gap-4">
          <p className="hidden text-sm text-muted-foreground sm:block">
            {items.length > 0 ? `${items.length} products` : "No products"}
          </p>
          <ProductSortSelect defaultValue={filters.sort ?? "newest"} />
        </div>
      </div>

      {items.length > 0 ? (
        <>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) => {
              const params = new URLSearchParams(
                rawSearchParams as Record<string, string>,
              );
              params.set("page", String(p));
              return `?${params.toString()}`;
            }}
          />
        </>
      ) : (
        <EmptyState
          icon={PackageSearch}
          title="No products match these filters"
          description="Try clearing some filters or check back soon."
          className="mt-8"
        />
      )}
    </div>
  );
}
