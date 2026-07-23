import { getProductReadByHandle } from "@/lib/medusa/products"
import {
  getAvailableInBundleProducts,
  getProductCurrencyCode,
  getBundleLink,
  getBundleProduct,
} from "@/lib/medusa/bundles"
import { getStrapiContent } from "@/lib/strapi/content"
import { getPublicProductDocuments } from "@/lib/product-documents/api"
import type { PricingContext } from "@/lib/medusa/regions"
import { sanitizeCmsHtml } from "@/lib/security/sanitize-cms-html"

interface StrapiProductDescription {
  id: number
  documentId: string
  medusa_product_id?: string
  product_handle?: string
  rich_description?: string
  rich_text?: string
}

interface StrapiResponse<T> {
  data: T[]
  meta: {
    pagination?: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

type ProductDescriptionRead =
  | { status: "found"; data: StrapiProductDescription; stale: boolean }
  | { status: "missing" }
  | { status: "unavailable" }

const lastProductDescriptionByHandle = new Map<
  string,
  StrapiProductDescription
>()

async function loadProductDescription(
  handle: string
): Promise<ProductDescriptionRead> {
  try {
    const response = await getStrapiContent<
      StrapiResponse<StrapiProductDescription>
    >("product-descriptions", {
      filters: {
        product_handle: {
          $eq: handle,
        },
      },
      pagination: {
        page: 1,
        pageSize: 1,
      },
    })
    const description = response.data?.find(
      (item) => item.product_handle === handle
    )

    if (!description) {
      lastProductDescriptionByHandle.delete(handle)
      return { status: "missing" }
    }

    lastProductDescriptionByHandle.set(handle, description)
    return { status: "found", data: description, stale: false }
  } catch {
    const cached = lastProductDescriptionByHandle.get(handle)
    return cached
      ? { status: "found", data: cached, stale: true }
      : { status: "unavailable" }
  }
}

export async function loadProductPageData(
  handle: string,
  pricingContext?: PricingContext
) {
  const [productRead, productDescription] = await Promise.all([
    getProductReadByHandle(handle, pricingContext),
    loadProductDescription(handle),
  ])

  if (productRead.status === "not_found") {
    return null
  }

  if (productRead.status === "unavailable") {
    return { status: "unavailable" as const }
  }

  const product = productRead.product

  const bundleLink = getBundleLink(product)
  const currencyCode = pricingContext?.currency_code ?? getProductCurrencyCode(product)
  const [bundleProduct, availableInBundles] = await Promise.all([
    bundleLink
      ? getBundleProduct(bundleLink.id, {
          region_id: pricingContext?.region_id,
          currency_code: currencyCode,
        })
      : Promise.resolve(null),
    bundleLink
      ? Promise.resolve([])
      : getAvailableInBundleProducts(product.id, {
          region_id: pricingContext?.region_id,
          currency_code: currencyCode,
        }),
  ])
  const productDocuments = await getPublicProductDocuments(product.id)

  const variantImageUrls =
    product.variants?.flatMap((variant) =>
      (variant.images || []).map((img) =>
        JSON.stringify({ id: img.id, url: String(img.url), variantId: variant.id })
      )
    ) || []

  const enrichedContent =
    productDescription.status === "found" &&
    (productDescription.data.medusa_product_id === product.id ||
      productDescription.data.product_handle === product.handle ||
      productDescription.data.product_handle === handle)
      ? productDescription.data
      : undefined

  const richDescription =
    enrichedContent?.rich_description ?? enrichedContent?.rich_text

  return {
    status: productRead.status,
    contentStatus: productDescription.status,
    contentStale:
      productDescription.status === "found"
        ? productDescription.stale
        : false,
    product,
    bundleLink,
    bundleProduct,
    availableInBundles,
    variantImageUrls,
    productDocuments,
    richDescription: richDescription
      ? sanitizeCmsHtml(richDescription)
      : undefined,
  }
}
