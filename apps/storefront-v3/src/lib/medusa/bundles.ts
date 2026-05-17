import type { MedusaProduct } from "./types"
import type { PricingContext } from "./regions"

export type BundleLink = {
  id: string
  handle?: string | null
  title?: string | null
  thumbnail?: string | null
}

type BundleLinkedProduct = MedusaProduct & {
  bundle?: BundleLink | BundleLink[] | null
}

export type BundleProductItem = {
  id: string
  quantity: number
  product: MedusaProduct
}

export type BundleProduct = {
  id: string
  title: string
  product?: MedusaProduct | null
  items: BundleProductItem[]
}

type ProductWithBundleDiscovery = Record<string, unknown> & {
  available_in_bundles?: unknown
  bundles?: unknown
  bundle_products?: unknown
  availableInBundles?: unknown
  availableInBundlesLinks?: unknown
}

function normalizeBundleLink(value: unknown): BundleLink | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const candidate = value as Record<string, unknown>
  const id = candidate.id

  if (typeof id !== "string" || id.length === 0) {
    return null
  }

  return {
    id,
    handle: typeof candidate.handle === "string" ? candidate.handle : undefined,
    title: typeof candidate.title === "string" ? candidate.title : undefined,
    thumbnail:
      typeof candidate.thumbnail === "string" ? candidate.thumbnail : undefined,
  }
}

function normalizeBundleLinks(value: unknown): BundleLink[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeBundleLink(entry))
      .filter((entry): entry is BundleLink => entry !== null)
  }

  const singleLink = normalizeBundleLink(value)
  return singleLink ? [singleLink] : []
}

function normalizeObject(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    return normalizeObject(value[0])
  }

  if (!value || typeof value !== "object") {
    return null
  }

  return value as Record<string, unknown>
}

function normalizeProduct(value: unknown): MedusaProduct | null {
  const product = normalizeObject(value)

  if (!product || typeof product.id !== "string") {
    return null
  }

  return product as unknown as MedusaProduct
}

function normalizeBundleItem(value: unknown): BundleProductItem | null {
  const item = normalizeObject(value)
  const product = normalizeProduct(item?.product)

  if (!item || !product) {
    return null
  }

  const quantity =
    typeof item.quantity === "number" && Number.isFinite(item.quantity)
      ? item.quantity
      : 1

  return {
    id:
      typeof item.id === "string" && item.id.length > 0
        ? item.id
        : `${product.id}-${quantity}`,
    quantity,
    product,
  }
}

function normalizeBundleProduct(value: unknown): BundleProduct | null {
  const bundle = normalizeObject(value)

  if (!bundle || typeof bundle.id !== "string") {
    return null
  }

  const product = normalizeProduct(bundle.product)
  const items = Array.isArray(bundle.items)
    ? bundle.items
        .map((item) => normalizeBundleItem(item))
        .filter((item): item is BundleProductItem => item !== null)
    : []

  return {
    id: bundle.id,
    title:
      typeof bundle.title === "string" && bundle.title.length > 0
        ? bundle.title
        : product?.title || "Bundle",
    product,
    items,
  }
}

export function getProductPath(handle: string, isBundle = false) {
  return `${isBundle ? "/bundles" : "/products"}/${handle}`
}

export function getProductCurrencyCode(product: MedusaProduct | null | undefined) {
  const firstVariant = product?.variants?.[0] as
    | (Record<string, unknown> & {
        calculated_price?: {
          currency_code?: string | null
        }
        prices?: Array<{
          currency_code?: string | null
        }>
      })
    | undefined

  const calculatedCurrency = firstVariant?.calculated_price?.currency_code
  if (typeof calculatedCurrency === "string" && calculatedCurrency.length > 0) {
    return calculatedCurrency.toLowerCase()
  }

  const listedCurrency = firstVariant?.prices?.find(
    (price) => typeof price?.currency_code === "string" && price.currency_code
  )?.currency_code

  if (typeof listedCurrency === "string" && listedCurrency.length > 0) {
    return listedCurrency.toLowerCase()
  }

  return "aud"
}

export function getBundleLink(product: MedusaProduct): BundleLink | null {
  const bundle = (product as BundleLinkedProduct).bundle

  if (Array.isArray(bundle)) {
    return bundle[0] ?? null
  }

  if (bundle && typeof bundle === "object" && "id" in bundle) {
    return bundle
  }

  return null
}

export function isBundledProduct(product: MedusaProduct) {
  return getBundleLink(product) !== null
}

export function getAvailableInBundleLinks(
  product: ProductWithBundleDiscovery
): BundleLink[] {
  const linkSources = [
    product.available_in_bundles,
    product.bundles,
    product.bundle_products,
    product.availableInBundles,
    product.availableInBundlesLinks,
  ]

  const deduped = new Map<string, BundleLink>()

  for (const source of linkSources) {
    for (const link of normalizeBundleLinks(source)) {
      deduped.set(link.id, link)
    }
  }

  return Array.from(deduped.values())
}

export async function getBundleProduct(
  bundleId: string,
  params?: {
    currency_code?: string
    region_id?: string
  }
): Promise<BundleProduct | null> {
  try {
    const { sdk } = await import("./client")
    const { bundle_product } = await sdk.client.fetch<{
      bundle_product: unknown
    }>(`/store/bundle-products/${bundleId}`, {
      method: "GET",
      query: params,
    })

    return normalizeBundleProduct(bundle_product)
  } catch (error) {
    console.warn(`Failed to fetch bundle product ${bundleId}`, error)
    return null
  }
}

export async function getBundleProductsById(
  products: MedusaProduct[],
  pricingContext?: Partial<PricingContext>
) {
  const bundleEntries = await Promise.all(
    products.map(async (product) => {
      const bundleLink = getBundleLink(product)
      if (!bundleLink) {
        return null
      }

      const bundleProduct = await getBundleProduct(bundleLink.id, {
        region_id: pricingContext?.region_id,
        currency_code:
          pricingContext?.currency_code ?? getProductCurrencyCode(product),
      })

      if (!bundleProduct) {
        return null
      }

      return [bundleLink.id, bundleProduct] as const
    })
  )

  return Object.fromEntries(
    bundleEntries.filter((entry): entry is readonly [string, BundleProduct] => entry !== null)
  )
}

export async function getAvailableInBundleProducts(
  productId: string,
  params?: {
    currency_code?: string
    region_id?: string
  }
) {
  try {
    const { sdk } = await import("./client")
    const { bundles } = await sdk.client.fetch<{
      bundles: unknown[]
    }>(`/store/products/${productId}/bundles`, {
      method: "GET",
      query: params,
    })

    return bundles
      .map((bundle) => normalizeBundleProduct(bundle))
      .filter((bundle): bundle is BundleProduct => bundle !== null)
  } catch (error) {
    console.warn(`Failed to fetch bundles containing product ${productId}`, error)
    return []
  }
}
