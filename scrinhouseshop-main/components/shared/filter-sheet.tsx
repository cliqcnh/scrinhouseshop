"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BrandFilter, ClearFiltersButton, ConditionFilter } from "@/components/shared/product-filters";

interface FilterSheetProps {
  brands: { id: string; name: string; slug: string }[];
  selectedBrandSlugs: string[];
  selectedCondition?: string;
  activeCount: number;
}

export function FilterSheet({
  brands,
  selectedBrandSlugs,
  selectedCondition,
  activeCount,
}: FilterSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 rounded-full"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal className="size-3.5" />
        Filter
        {activeCount > 0 && <span className="text-xs text-muted-foreground">({activeCount})</span>}
      </Button>
      <SheetContent side="left" className="w-80">
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle>Filters</SheetTitle>
          <ClearFiltersButton />
        </SheetHeader>
        <div className="space-y-6 px-4">
          <BrandFilter brands={brands} selectedSlugs={selectedBrandSlugs} />
          <ConditionFilter selected={selectedCondition} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
