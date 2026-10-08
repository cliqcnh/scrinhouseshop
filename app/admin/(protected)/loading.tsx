export default function AdminLoading() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in-50 duration-200">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
          <div className="h-4 w-72 rounded bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
        </div>
        <div className="h-9 w-28 rounded-xl bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
      </div>

      {/* Metrics Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="size-8 rounded-full bg-neutral-200 dark:bg-neutral-800" />
            </div>
            <div className="h-8 w-20 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4 animate-pulse">
        <div className="h-5 w-40 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="space-y-3 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 w-full rounded-xl bg-neutral-100 dark:bg-neutral-900" />
          ))}
        </div>
      </div>
    </div>
  );
}
