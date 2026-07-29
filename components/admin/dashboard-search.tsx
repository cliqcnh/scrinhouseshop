"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Package, FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/utils/format";
import type { AdminProductRow } from "@/services/admin-service";

interface DashboardSearchProps {
  products: AdminProductRow[];
}

export function DashboardSearch({ products }: DashboardSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAndGroupedProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // 1. Filter products
    const filtered = products.filter((p) => {
      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(query)) ||
        (p.brandName && p.brandName.toLowerCase().includes(query))
      );
    });

    // 2. Group by category
    const groups: Record<string, AdminProductRow[]> = {};
    filtered.forEach((p) => {
      const cat = p.categoryName || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });

    // Sort categories alphabetically
    const sortedCategories = Object.keys(groups).sort();
    
    return {
      groups,
      categories: sortedCategories,
      totalCount: filtered.length,
    };
  }, [products, searchQuery]);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Package className="size-4 text-muted-foreground" />
            Quick Catalog Search
          </h2>
          <p className="text-xs text-muted-foreground">
            Search products instantly, grouped by categories.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, SKU, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md pl-9 text-sm"
          />
        </div>
      </div>

      {filteredAndGroupedProducts.totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-lg">
          <FolderOpen className="size-8 text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground">No matching products found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your search query.</p>
        </div>
      ) : (
        <div className="space-y-6 max-h-[480px] overflow-y-auto pr-1">
          {filteredAndGroupedProducts.categories.map((categoryName) => {
            const catProducts = filteredAndGroupedProducts.groups[categoryName];
            return (
              <div key={categoryName} className="space-y-2.5">
                <div className="flex items-center gap-2 sticky top-0 bg-card py-1 z-10 border-b border-border/60">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {categoryName}
                  </span>
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                    {catProducts.length}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {catProducts.map((p) => (
                    <Link
                      key={p.id}
                      href={`/admin/products/${p.id}`}
                      className="group flex flex-col justify-between rounded-lg border border-border p-3 hover:border-primary/40 hover:bg-muted/30 transition-all text-left"
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {p.name}
                          </p>
                          <Badge
                            variant={p.isActive ? "default" : "secondary"}
                            className="text-[9px] px-1 py-0 scale-90 origin-top-right shrink-0"
                          >
                            {p.isActive ? "Active" : "Draft"}
                          </Badge>
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground">
                          SKU: {p.sku || "N/A"}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[11px]">
                        <span className="font-semibold text-foreground">
                          {formatPrice(p.basePrice)}
                        </span>
                        <span
                          className={`font-medium ${
                            p.totalStock === 0
                              ? "text-destructive"
                              : p.totalStock <= 5
                              ? "text-orange-500"
                              : "text-muted-foreground"
                          }`}
                        >
                          Stock: {p.totalStock}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
