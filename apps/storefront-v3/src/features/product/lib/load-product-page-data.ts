import { getProductByHandle } from "@/lib/medusa/products"
import {
  getAvailableInBundleProducts,
  getProductCurrencyCode,
  getBundleLink,
  getBundleProduct,
} from "@/lib/medusa/bundles"
import { getStrapiContent } from "@/lib/strapi/content"

interface StrapiProductDescription {
  id: number
  medusa_id: string
  rich_text: string
  documentId: string
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

export async function loadProductPageData(handle: string) {
  const [product, strapiData] = await Promise.all([
    getProductByHandle(handle),
    getStrapiContent<StrapiResponse<StrapiProductDescription>>("product-descriptions", {
      filters: { medusa_id: { $eq: null } },
    }).catch(() => ({ data: [] })),
  ])

  if (!product) {
    return null
  }

  const bundleLink = getBundleLink(product)
  const currencyCode = getProductCurrencyCode(product)
  const [bundleProduct, availableInBundles] = await Promise.all([
    bundleLink
      ? getBundleProduct(bundleLink.id, {
          currency_code: currencyCode,
        })
      : Promise.resolve(null),
    bundleLink
      ? Promise.resolve([])
      : getAvailableInBundleProducts(product.id, {
          currency_code: currencyCode,
        }),
  ])

  const variantImageUrls =
    product.variants?.flatMap((variant) =>
      (variant.images || []).map((img) =>
        JSON.stringify({ id: img.id, url: String(img.url), variantId: variant.id })
      )
    ) || []

  const enrichedContent = strapiData?.data?.find(
    (item) => item.medusa_id === product.id
  )

  return {
    product,
    bundleLink,
    bundleProduct,
    availableInBundles,
    variantImageUrls,
    richDescription: enrichedContent?.rich_text,
  }
}
