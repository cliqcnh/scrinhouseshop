"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "popular", label: "Most Popular" },
];

export function ProductSortSelect({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <Select
      defaultValue={defaultValue}
      onValueChange={(value) => {
        if (!value) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", value);
        params.delete("page");
        router.push(`?${params.toString()}`);
      }}
    >
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface BrandFilterProps {
  brands: { id: string; name: string; slug: string }[];
  selectedSlugs: string[];
}

export function BrandFilter({ brands, selectedSlugs }: BrandFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function toggleBrand(slug: string, checked: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    const current = new Set(params.getAll("brand"));
    if (checked) {
      current.add(slug);
    } else {
      current.delete(slug);
    }
    params.delete("brand");
    current.forEach((s) => params.append("brand", s));
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  if (brands.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Brand</h3>
      <div className="space-y-2">
        {brands.map((brand) => (
          <div key={brand.id} className="flex items-center gap-2">
            <Checkbox
              id={`brand-${brand.slug}`}
              checked={selectedSlugs.includes(brand.slug)}
              onCheckedChange={(checked) => toggleBrand(brand.slug, checked === true)}
            />
            <Label htmlFor={`brand-${brand.slug}`} className="text-sm font-normal text-muted-foreground">
              {brand.name}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConditionFilter({ selected }: { selected?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const options: { value: "brand_new" | "uk_used"; label: string }[] = [
    { value: "brand_new", label: "Brand New" },
    { value: "uk_used", label: "UK Used" },
  ];

  function setCondition(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (selected === value) {
      params.delete("condition");
    } else {
      params.set("condition", value);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Condition</h3>
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <Checkbox
              id={`condition-${option.value}`}
              checked={selected === option.value}
              onCheckedChange={() => setCondition(option.value)}
            />
            <Label htmlFor={`condition-${option.value}`} className="text-sm font-normal text-muted-foreground">
              {option.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClearFiltersButton() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasFilters = ["brand", "condition", "minPrice", "maxPrice"].some((key) =>
    searchParams.has(key),
  );

  if (!hasFilters) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground"
      onClick={() => {
        const params = new URLSearchParams(searchParams.toString());
        ["brand", "condition", "minPrice", "maxPrice", "page"].forEach((key) => params.delete(key));
        router.push(`?${params.toString()}`);
      }}
    >
      Clear filters
    </Button>
  );
}
