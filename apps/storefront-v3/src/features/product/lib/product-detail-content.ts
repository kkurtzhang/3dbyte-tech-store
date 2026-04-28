import type { MedusaProduct, MedusaProductVariant } from "@/lib/medusa/types"

export interface ProductDetailItem {
  label: string
  value: string
}

export interface ProductBreadcrumbItem {
  label: string
  href?: string
}

export interface ProductSourceContext {
  label: string
  href: string
}

function toDisplayString(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

export function buildProductBreadcrumbs(
  product: MedusaProduct,
  sourceContext?: ProductSourceContext | null
): ProductBreadcrumbItem[] {
  const collection = product.collection as { handle?: string; title?: string } | undefined

  return [
    { label: "Home", href: "/" },
    sourceContext
      ? { label: sourceContext.label, href: sourceContext.href }
      : { label: "Shop", href: "/shop" },
    ...(!sourceContext && collection?.handle && collection?.title
      ? [{ label: collection.title, href: `/collections/${collection.handle}` }]
      : []),
    { label: product.title },
  ]
}

export function buildProductDetailItems(
  product: MedusaProduct,
  selectedVariant?: MedusaProductVariant
): ProductDetailItem[] {
  const tags = (product.tags || [])
    .map((tag) => toDisplayString((tag as { value?: string }).value))
    .filter(Boolean)
    .slice(0, 3)
    .join(", ")

  const detailItems: Array<ProductDetailItem | null> = [
    toDisplayString(selectedVariant?.sku)
      ? { label: "SKU", value: selectedVariant?.sku as string }
      : null,
    toDisplayString(product.collection && (product.collection as { title?: string }).title)
      ? {
          label: "Collection",
          value: (product.collection as { title?: string }).title as string,
        }
      : null,
    toDisplayString(product.type?.value)
      ? { label: "Product Type", value: product.type?.value as string }
      : null,
    toDisplayString(product.material)
      ? { label: "Material", value: product.material as string }
      : null,
    typeof product.weight === "number" && product.weight > 0
      ? { label: "Weight", value: `${product.weight}g` }
      : null,
    toDisplayString(product.origin_country)
      ? { label: "Origin", value: String(product.origin_country).toUpperCase() }
      : null,
    tags ? { label: "Best For", value: tags } : null,
  ]

  return detailItems.filter((item): item is ProductDetailItem => Boolean(item))
}
