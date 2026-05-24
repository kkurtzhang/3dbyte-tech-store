import { getProductByHandle } from "@/lib/medusa/products"
import {
  getAvailableInBundleProducts,
  getProductCurrencyCode,
  getBundleLink,
  getBundleProduct,
} from "@/lib/medusa/bundles"
import { getStrapiContent } from "@/lib/strapi/content"
import { getPublicProductDocuments } from "@/lib/product-documents/api"
import type { PricingContext } from "@/lib/medusa/regions"

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

export async function loadProductPageData(
  handle: string,
  pricingContext?: PricingContext
) {
  const [product, strapiData] = await Promise.all([
    getProductByHandle(handle, pricingContext),
    getStrapiContent<StrapiResponse<StrapiProductDescription>>("product-descriptions", {
      filters: { medusa_id: { $eq: null } },
    }).catch(() => ({ data: [] })),
  ])

  if (!product) {
    return null
  }

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

  const enrichedContent = strapiData?.data?.find(
    (item) => item.medusa_id === product.id
  )

  return {
    product,
    bundleLink,
    bundleProduct,
    availableInBundles,
    variantImageUrls,
    productDocuments,
    richDescription: enrichedContent?.rich_text,
  }
}
