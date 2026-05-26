import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { MEILISEARCH_MODULE } from "../../../modules/meilisearch"
import type MeilisearchModuleService from "../../../modules/meilisearch/service"
import { flattenAiProductMetadata } from "../../../modules/meilisearch/utils/ai-product-metadata"
import { STRAPI_MODULE, type StrapiModuleService } from "../../../modules/strapi"
import {
  authorizeInternalAiRequest,
  getPositiveInteger,
  getTrimmedString,
  type AiRouteBody,
} from "../_utils"

type ProductRecord = Record<string, unknown> & {
  id: string
  title?: string
  handle?: string
}

type ProductHit = Record<string, unknown> & {
  id?: string
  title?: string
  handle?: string
  thumbnail?: string
  price_aud?: number
  in_stock?: boolean
}

const trimTrailingSlash = (value: string): string => value.trim().replace(/\/$/, "")

const isHttpOrigin = (value: string | undefined): value is string => {
  const trimmedValue = value?.trim()

  return Boolean(trimmedValue && /^https?:\/\//.test(trimmedValue))
}

const getFirstStoreCorsOrigin = (): string | undefined =>
  process.env.STORE_CORS?.split(",")
    .map((origin) => origin.trim())
    .find(isHttpOrigin)

const getStorefrontUrl = (): string =>
  trimTrailingSlash(
    [
      process.env.STOREFRONT_URL,
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.SERVICE_FQDN_STOREFRONT,
      process.env.SERVICE_URL_STOREFRONT,
      getFirstStoreCorsOrigin(),
    ].find(isHttpOrigin) ?? "http://localhost:3001"
  )

const buildProductUrl = (handle: string | undefined): string | null =>
  handle ? `${getStorefrontUrl()}/products/${encodeURIComponent(handle)}` : null

const productFields = [
  "id",
  "title",
  "handle",
  "status",
  "description",
  "thumbnail",
  "metadata",
  "variants.id",
  "variants.title",
  "variants.sku",
  "variants.inventory_quantity",
  "categories.name",
  "tags.value",
]

function toProductResponse(
  product: ProductRecord,
  hit: ProductHit | undefined,
  strapiDescription: Record<string, unknown> | null
) {
  const handle = product.handle ?? hit?.handle

  return {
    id: product.id,
    title: product.title ?? hit?.title ?? "Untitled product",
    handle,
    productUrl: buildProductUrl(handle),
    description: product.description ?? null,
    thumbnail: product.thumbnail ?? hit?.thumbnail ?? null,
    priceAud: hit?.price_aud ?? null,
    inStock: hit?.in_stock ?? null,
    variants: product.variants ?? hit?.variants ?? [],
    aiContext: flattenAiProductMetadata(product.metadata),
    strapi: strapiDescription
      ? {
          richDescription: strapiDescription.rich_description ?? null,
          features: strapiDescription.features ?? [],
          specifications: strapiDescription.specifications ?? {},
        }
      : null,
    authoritativeContext: {
      medusa: true,
      meilisearch: Boolean(hit),
      strapi: Boolean(strapiDescription),
    },
  }
}

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  if (!authorizeInternalAiRequest(req, res)) return

  const body = req.body as AiRouteBody
  const queryText = getTrimmedString(body.query)
  const limit = getPositiveInteger(body.limit, 4, 6)

  if (!queryText) {
    res.status(400).json({ products: [], error: "Product guidance query is required" })
    return
  }

  const query = req.scope.resolve("query")
  const meilisearch =
    req.scope.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE)
  const strapi = req.scope.resolve<StrapiModuleService>(STRAPI_MODULE)
  const searchResult = await meilisearch.search<ProductHit>(queryText, "product", {
    limit,
  })
  const hits = searchResult.hits ?? []
  const hitById = new Map(
    hits
      .filter((hit): hit is ProductHit & { id: string } => Boolean(hit.id))
      .map((hit) => [hit.id, hit])
  )
  const ids = [...hitById.keys()]

  const { data } = await query.graph({
    entity: "product",
    fields: productFields,
    filters: ids.length ? { id: ids } : { status: "published" },
    pagination: { take: limit },
  })

  const products = ((data ?? []) as ProductRecord[]).filter((product) =>
    Boolean(product.id)
  )
  const enrichedProducts = await Promise.all(
    products.map(async (product) => {
      const strapiDescription = await strapi
        .getProductDescription(product.id)
        .catch(() => null)

      return toProductResponse(product, hitById.get(product.id), strapiDescription)
    })
  )

  res.json({ products: enrichedProducts })
}
