export default function StorefrontLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in-50 duration-200">
      {/* Hero Skeleton Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-100 dark:bg-neutral-900 h-64 sm:h-80 w-full animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent animate-shimmer" />
      </div>

      {/* Categories Grid Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-36 rounded-md bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-border animate-pulse" />
          ))}
        </div>
      </div>

      {/* Products Grid Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-44 rounded-md bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border p-4 space-y-3 bg-background animate-pulse">
              <div className="h-44 rounded-xl bg-neutral-100 dark:bg-neutral-900 w-full" />
              <div className="h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
