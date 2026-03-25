import type { MedusaProduct, MedusaProductVariant } from "@/lib/medusa/types"

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
  } as MedusaProductVariant
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
  } as MedusaProduct
}

function mergePrimaryVariant(
  previewVariant: MedusaProductVariant | undefined,
  fetchedVariant: MedusaProductVariant | undefined
): MedusaProductVariant | undefined {
  if (!fetchedVariant) {
    return previewVariant
  }

  return {
    ...previewVariant,
    ...fetchedVariant,
    thumbnail: fetchedVariant.thumbnail || previewVariant?.thumbnail,
    prices:
      fetchedVariant.prices && fetchedVariant.prices.length > 0
        ? fetchedVariant.prices
        : previewVariant?.prices,
    calculated_price:
      fetchedVariant.calculated_price || previewVariant?.calculated_price,
    inventory_quantity:
      fetchedVariant.inventory_quantity ?? previewVariant?.inventory_quantity,
    manage_inventory:
      fetchedVariant.manage_inventory ?? previewVariant?.manage_inventory,
  } as MedusaProductVariant
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

export function buildQuickViewSummary(
  product: Pick<MedusaProduct, "description">
) {
  const summary = normalizeText(product.description)

  if (!summary) {
    return undefined
  }

  return summary.length > 160 ? `${summary.slice(0, 157).trimEnd()}...` : summary
}

export function buildQuickViewDetailChips(
  product: Pick<MedusaProduct, "collection" | "type">,
  selectedVariant?: Pick<MedusaProductVariant, "sku" | "options"> | null
) {
  const details = [
    selectedVariant?.sku ? `SKU ${selectedVariant.sku}` : undefined,
    product.collection?.title ? `Collection ${product.collection.title}` : undefined,
    product.type?.value ? `Type ${product.type.value}` : undefined,
    ...(selectedVariant?.options?.map((option) => {
      const title = normalizeText(option.option?.title ?? option.option_id ?? "")
      const value = normalizeText(option.value)
      return title && value ? `${title} ${value}` : value || undefined
    }) ?? []),
  ].filter((value): value is string => Boolean(value))

  return details.slice(0, 4)
}
