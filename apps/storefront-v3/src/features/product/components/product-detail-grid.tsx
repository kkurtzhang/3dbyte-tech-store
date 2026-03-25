import type { ProductDetailItem } from "../lib/product-detail-content"

interface ProductDetailGridProps {
  items: ProductDetailItem[]
}

export function ProductDetailGrid({ items }: ProductDetailGridProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-border/70 bg-background">
      <div className="border-b bg-muted/40 px-4 py-3">
        <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
          Product Detail
        </p>
        <h3 className="mt-1 text-base font-semibold text-foreground">
          Key information for fit, ordering, and support.
        </h3>
      </div>

      <div className="grid gap-px bg-border/60 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="bg-background px-4 py-3">
            <p className="text-xs font-mono uppercase tracking-[0.16em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-2 text-sm font-medium leading-6 text-foreground">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
