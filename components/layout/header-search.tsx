"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/utils/format";
import { getProductSuggestions, type ProductSuggestion } from "@/actions/storefront/search-suggestions";

export function HeaderSearch({ isMobile }: { isMobile?: boolean }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search suggestions query
  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await getProductSuggestions(trimmed);
        setSuggestions(res);
        setIsOpen(res.length > 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [q]);

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = q.trim();
    if (trimmed) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <div
      ref={containerRef}
      className={isMobile ? "relative w-full" : "relative hidden sm:block w-56 lg:w-72"}
    >
      <form role="search" className="relative w-full" onSubmit={handleSearchSubmit}>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search phones, parts, accessories..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          className="w-full rounded-full pl-9 bg-muted/40 border-border text-xs sm:text-sm h-9"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground animate-spin" />
        )}
      </form>

      {/* Floating Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto border border-border bg-white shadow-2xl rounded-none">
          <div className="p-2 border-b border-border bg-muted/20 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Suggested Products
          </div>
          {suggestions.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => {
                setIsOpen(false);
                setQ("");
                router.push(`/products/${p.slug}`);
              }}
              className="flex items-center gap-3 w-full text-left px-3 py-2.5 hover:bg-muted font-medium transition-colors border-b border-border last:border-0 text-foreground bg-white"
            >
              <div className="relative size-8 shrink-0 overflow-hidden rounded bg-muted border border-border">
                {p.primaryImageUrl && (
                  <Image src={p.primaryImageUrl} alt="" fill className="object-cover" sizes="32px" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-foreground">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatPrice(p.basePrice)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
