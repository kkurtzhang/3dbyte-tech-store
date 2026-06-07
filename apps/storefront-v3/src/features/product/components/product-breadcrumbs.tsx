import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type {
  ProductBreadcrumbItem,
  ProductSourceContext,
} from "../lib/product-detail-content"

interface ProductBreadcrumbsProps {
  items: ProductBreadcrumbItem[]
  sourceContext?: ProductSourceContext | null
}

export function ProductBreadcrumbs({ items, sourceContext }: ProductBreadcrumbsProps) {
  void sourceContext

  return (
    <div className="mb-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.href ? (
              <Link href={item.href} className="transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground">{item.label}</span>
            )}
            {index < items.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
          </div>
        ))}
      </nav>
    </div>
  )
}
