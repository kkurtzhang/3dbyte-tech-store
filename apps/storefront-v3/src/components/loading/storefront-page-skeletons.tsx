import type { ReactNode } from "react"

function SkeletonBlock({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse bg-muted ${className}`} />
}

function LoadingSurface({
  label,
  testId,
  children,
}: {
  label: string
  testId: string
  children: ReactNode
}) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      data-testid={testId}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

export function ProductPageSkeleton() {
  return (
    <LoadingSurface label="Loading product" testId="product-page-skeleton">
      <div className="space-y-8">
        <SkeletonBlock className="h-4 w-48 rounded-sm" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:gap-12">
          <div className="space-y-4">
            <SkeletonBlock className="aspect-square w-full rounded-md" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock
                  key={index}
                  className="aspect-square w-full rounded-md"
                />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-3">
              <SkeletonBlock className="h-4 w-24 rounded-sm" />
              <SkeletonBlock className="h-9 w-4/5 rounded-sm" />
              <SkeletonBlock className="h-7 w-32 rounded-sm" />
            </div>
            <div className="space-y-3">
              <SkeletonBlock className="h-4 w-20 rounded-sm" />
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <SkeletonBlock
                    key={index}
                    className="h-11 rounded-md"
                  />
                ))}
              </div>
            </div>
            <SkeletonBlock className="h-12 w-full rounded-md" />
            <div className="space-y-2 border-t pt-6">
              <SkeletonBlock className="h-4 w-full rounded-sm" />
              <SkeletonBlock className="h-4 w-11/12 rounded-sm" />
              <SkeletonBlock className="h-4 w-3/4 rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    </LoadingSurface>
  )
}

export function CartPageSkeleton() {
  return (
    <LoadingSurface label="Loading cart" testId="cart-page-skeleton">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <SkeletonBlock className="h-8 w-52 rounded-sm" />
          <div className="divide-y rounded-md border bg-card px-5">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 py-5"
              >
                <SkeletonBlock className="h-24 w-24 rounded-md" />
                <div className="space-y-3 py-1">
                  <SkeletonBlock className="h-5 w-3/4 rounded-sm" />
                  <SkeletonBlock className="h-4 w-36 rounded-sm" />
                  <div className="flex items-center justify-between pt-2">
                    <SkeletonBlock className="h-9 w-28 rounded-md" />
                    <SkeletonBlock className="h-5 w-20 rounded-sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-4">
          <div className="space-y-5 rounded-md border bg-card p-6">
            <SkeletonBlock className="h-6 w-36 rounded-sm" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex justify-between gap-6">
                  <SkeletonBlock className="h-4 w-24 rounded-sm" />
                  <SkeletonBlock className="h-4 w-16 rounded-sm" />
                </div>
              ))}
            </div>
            <SkeletonBlock className="h-11 w-full rounded-md" />
          </div>
        </div>
      </div>
    </LoadingSurface>
  )
}

export function CheckoutPageSkeleton() {
  return (
    <LoadingSurface label="Loading checkout" testId="checkout-page-skeleton">
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
        <div className="space-y-6 lg:col-span-7">
          <SkeletonBlock className="h-8 w-36 rounded-sm" />
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-4 rounded-md border bg-card p-6">
              <SkeletonBlock className="h-6 w-44 rounded-sm" />
              <SkeletonBlock className="h-11 w-full rounded-md" />
              <div className="grid grid-cols-2 gap-4">
                <SkeletonBlock className="h-11 rounded-md" />
                <SkeletonBlock className="h-11 rounded-md" />
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-5">
          <div className="space-y-5 rounded-md border bg-card p-6">
            <SkeletonBlock className="h-6 w-36 rounded-sm" />
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="flex gap-4">
                  <SkeletonBlock className="h-16 w-16 shrink-0 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-4/5 rounded-sm" />
                    <SkeletonBlock className="h-4 w-24 rounded-sm" />
                  </div>
                </div>
              ))}
            </div>
            <SkeletonBlock className="h-px w-full" />
            <SkeletonBlock className="h-5 w-full rounded-sm" />
            <SkeletonBlock className="h-5 w-full rounded-sm" />
          </div>
        </div>
      </div>
    </LoadingSurface>
  )
}

export function AccountShellSkeleton() {
  return (
    <LoadingSurface label="Loading account" testId="account-shell-skeleton">
      <div className="container py-8">
        <div className="flex flex-col gap-8 md:flex-row">
          <aside className="w-full shrink-0 space-y-3 md:w-56">
            <SkeletonBlock className="h-7 w-32 rounded-sm" />
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-10 w-full rounded-md" />
            ))}
          </aside>
          <main className="min-w-0 flex-1 space-y-6">
            <SkeletonBlock className="h-8 w-48 rounded-sm" />
            <div className="grid gap-4 sm:grid-cols-2">
              <SkeletonBlock className="h-32 rounded-md" />
              <SkeletonBlock className="h-32 rounded-md" />
            </div>
            <SkeletonBlock className="h-52 w-full rounded-md" />
          </main>
        </div>
      </div>
    </LoadingSurface>
  )
}
