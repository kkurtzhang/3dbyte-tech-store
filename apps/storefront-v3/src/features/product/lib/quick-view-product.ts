import type { MedusaProduct, MedusaProductVariant } from "@/lib/medusa/types"

type QuickViewVariant = MedusaProductVariant & {
  prices?: {
    amount?: number
    currency_code?: string
  }[]
  calculated_price?: {
    calculated_amount?: number
    original_amount?: number
    currency_code?: string
  }
}

export interface QuickViewProductPreview {
  id: string
  handle: string
  title: string
  thumbnail?: string | null
  price: {
    amount: number
    currency_code: string
  }
  originalPrice?: number
  inventoryQuantity?: number
  inStock?: boolean
  isBundle?: boolean
  isPreorder?: boolean
  preorderAvailableDate?: string
  bundleItemCount?: number
  bundleItemTitles?: string[]
}

function buildPreviewVariant(
  preview: QuickViewProductPreview
): MedusaProductVariant {
  const currencyCode = preview.price.currency_code.toLowerCase()
  const calculatedAmount = preview.price.amount
  const originalAmount = preview.originalPrice ?? calculatedAmount

  return {
    id: `preview-variant-${preview.id}`,
    title: "Default",
    thumbnail: preview.thumbnail ?? undefined,
    inventory_quantity:
      preview.inventoryQuantity ??
      (preview.inStock === false ? 0 : 99),
    manage_inventory: preview.inventoryQuantity !== undefined || preview.inStock === false,
    prices: [
      {
        amount: calculatedAmount,
        currency_code: currencyCode,
      },
    ],
    calculated_price: {
      calculated_amount: calculatedAmount,
      original_amount: originalAmount,
      currency_code: currencyCode,
    },
  } as unknown as MedusaProductVariant
}

export function buildQuickViewPreviewProduct(
  preview: QuickViewProductPreview
): MedusaProduct {
  const variant = buildPreviewVariant(preview)

  return {
    id: preview.id,
    handle: preview.handle,
    title: preview.title,
    thumbnail: preview.thumbnail ?? undefined,
    description: "",
    images: preview.thumbnail
      ? [
          {
            id: `preview-image-${preview.id}`,
            url: preview.thumbnail,
          },
        ]
      : [],
    options: [],
    variants: [variant],
    is_bundle: preview.isBundle,
    is_preorder: preview.isPreorder,
    preorder_available_date: preview.preorderAvailableDate,
    bundle_item_count: preview.bundleItemCount ?? 0,
    bundle_item_titles: preview.bundleItemTitles ?? [],
  } as unknown as MedusaProduct
}

function mergePrimaryVariant(
  previewVariant: MedusaProductVariant | undefined,
  fetchedVariant: MedusaProductVariant | undefined
): MedusaProductVariant | undefined {
  if (!fetchedVariant) {
    return previewVariant
  }

  const preview = previewVariant as QuickViewVariant | undefined
  const fetched = fetchedVariant as QuickViewVariant

  return {
    ...previewVariant,
    ...fetchedVariant,
    thumbnail: fetchedVariant.thumbnail || preview?.thumbnail,
    prices:
      fetched.prices && fetched.prices.length > 0
        ? fetched.prices
        : preview?.prices,
    calculated_price:
      fetched.calculated_price || preview?.calculated_price,
    inventory_quantity:
      fetchedVariant.inventory_quantity ?? preview?.inventory_quantity,
    manage_inventory:
      fetchedVariant.manage_inventory ?? preview?.manage_inventory,
  } as unknown as MedusaProductVariant
}

export function mergeQuickViewProductData(
  previewProduct: MedusaProduct | null,
  fetchedProduct: MedusaProduct
): MedusaProduct {
  if (!previewProduct) {
    return fetchedProduct
  }

  const previewVariant = previewProduct.variants?.[0]
  const fetchedVariants = fetchedProduct.variants?.length
    ? fetchedProduct.variants.map((variant, index) =>
        index === 0 ? mergePrimaryVariant(previewVariant, variant) ?? variant : variant
      )
    : previewProduct.variants

  return {
    ...previewProduct,
    ...fetchedProduct,
    title: fetchedProduct.title || previewProduct.title,
    thumbnail: fetchedProduct.thumbnail || previewProduct.thumbnail,
    description: fetchedProduct.description || previewProduct.description,
    images:
      fetchedProduct.images && fetchedProduct.images.length > 0
        ? fetchedProduct.images
        : previewProduct.images,
    options:
      fetchedProduct.options && fetchedProduct.options.length > 0
        ? fetchedProduct.options
        : previewProduct.options,
    variants: fetchedVariants,
  } as MedusaProduct
}

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? ""
}

function isDefaultLikeText(value: string | null | undefined) {
  const normalizedValue = normalizeText(value).toLowerCase()

  return (
    !normalizedValue ||
    normalizedValue === "default" ||
    normalizedValue === "default title" ||
    normalizedValue === "default variant" ||
    normalizedValue === "standard" ||
    normalizedValue.startsWith("default ")
  )
}

export function buildQuickViewSummary(
  product: Pick<MedusaProduct, "description">
) {
  const summary = normalizeText(product.description)

  if (!summary) {
    return undefined
  }

  return summary.length > 160 ? `${summary.slice(0, 157).trimEnd()}...` : summary
}

export type QuickViewBundleItem = {
  quantity?: number
  title: string
}

export function buildQuickViewBundleItems(
  product: {
    bundle?: {
      items?: Array<{
        product?: {
          title?: string | null
        } | null
        quantity?: number | null
      }> | null
    } | null
    bundle_item_count?: number
    bundle_item_titles?: string[]
  }
): QuickViewBundleItem[] {
  const bundleItems: QuickViewBundleItem[] = Array.isArray(product.bundle?.items)
    ? product.bundle.items
        .reduce<QuickViewBundleItem[]>((items, item) => {
          const title = normalizeText(item.product?.title)

          return title
            ? [
                ...items,
                {
                  quantity:
                    typeof item.quantity === "number" && item.quantity > 0
                      ? item.quantity
                      : undefined,
                  title,
                },
              ]
            : items
        }, [])
    : []

  if (bundleItems.length > 0) {
    return bundleItems
  }

  return (product.bundle_item_titles ?? [])
    .map((title) => normalizeText(title))
    .filter((title) => title.length > 0)
    .slice(0, product.bundle_item_count ?? undefined)
    .map((title) => ({ title }))
}

export function buildQuickViewDetailChips(
  product: Pick<MedusaProduct, "collection" | "type">,
  selectedVariant?: Pick<MedusaProductVariant, "sku" | "options"> | null
) {
  const details = [
    product.type?.value && !isDefaultLikeText(product.type.value)
      ? `Type ${product.type.value}`
      : undefined,
    ...(selectedVariant?.options?.map((option) => {
      const title = normalizeText(option.option?.title ?? option.option_id ?? "")
      const value = normalizeText(option.value)

      if (isDefaultLikeText(value)) {
        return undefined
      }

      return title && !isDefaultLikeText(title) ? `${title} ${value}` : value
    }) ?? []),
  ].filter((value): value is string => Boolean(value))

  return details.slice(0, 4)
}
