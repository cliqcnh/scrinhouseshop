import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

export function Pagination({ page, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
      <Button
        variant="outline"
        size="icon"
        disabled={!hasPrev}
        aria-label="Previous page"
        {...(hasPrev ? { render: <Link href={buildHref(page - 1)} /> } : {})}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <span className="px-3 text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>

      <Button
        variant="outline"
        size="icon"
        disabled={!hasNext}
        aria-label="Next page"
        {...(hasNext ? { render: <Link href={buildHref(page + 1)} /> } : {})}
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}
