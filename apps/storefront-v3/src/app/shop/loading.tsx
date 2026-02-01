export default function ShopLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Skeleton */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-[200px] animate-pulse rounded bg-muted" />
      </div>

      {/* Filters and Grid Skeleton */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[250px_1fr]">
        {/* Filters Sidebar Skeleton */}
        <div className="hidden lg:block">
          <div className="space-y-6">
            <div className="h-6 w-20 animate-pulse rounded bg-muted" />
            <div className="h-64 animate-pulse rounded bg-muted" />
          </div>
        </div>

        {/* Product Grid Skeleton */}
        <div className="space-y-8">
          {/* Mobile Filters Skeleton */}
          <div className="h-20 lg:hidden animate-pulse rounded bg-muted" />

          {/* Products Skeleton */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-96 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
