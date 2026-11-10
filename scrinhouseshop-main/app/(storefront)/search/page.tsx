import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { ProductCard } from "@/components/shared/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { ProductSortSelect } from "@/components/shared/product-filters";
import { parseProductSearchParams } from "@/lib/validations/catalog";
import { listProducts } from "@/services/catalog-service";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  return { title: q ? `Search results for "${q}"` : "Search" };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const rawSearchParams = await searchParams;
  const filters = parseProductSearchParams(rawSearchParams);
  const query = filters.query ?? "";

  const { items, page, totalPages } = query
    ? await listProducts(filters)
    : { items: [], page: 1, totalPages: 1 };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-heading font-bold text-foreground sm:text-4xl">
        {query ? `Search results for "${query}"` : "Search"}
      </h1>

      {query && (
        <div className="mt-8 flex items-center justify-between border-y border-border py-3">
          <p className="text-sm text-muted-foreground">{items.length} results</p>
          <ProductSortSelect defaultValue={filters.sort ?? "newest"} />
        </div>
      )}

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
              const params = new URLSearchParams(rawSearchParams as Record<string, string>);
              params.set("page", String(p));
              return `?${params.toString()}`;
            }}
          />
        </>
      ) : (
        <EmptyState
          icon={SearchX}
          title={query ? "No products found" : "Start typing to search"}
          description={
            query ? "Try a different search term." : "Search for phones, accessories, or parts."
          }
          className="mt-10"
        />
      )}
    </div>
  );
}
