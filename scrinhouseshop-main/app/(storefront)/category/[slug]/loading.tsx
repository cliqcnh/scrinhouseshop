import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/components/shared/product-card-skeleton";

export default function CategoryLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="h-10 w-64" />
      <div className="mt-8 flex items-center justify-between border-y border-border py-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="mt-8">
        <ProductGridSkeleton count={9} />
      </div>
    </div>
  );
}
