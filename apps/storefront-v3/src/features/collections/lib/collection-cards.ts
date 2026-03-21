import type { CollectionDescriptionData } from "@/lib/strapi/types"

export interface CollectionCardSource {
  id: string
  handle: string
  title: string
  metadata?: unknown
}

export interface CollectionCardData {
  id: string
  href: string
  title: string
  description: string
  imageUrl?: string
  imageAlt: string
  initial: string
}

function getFallbackDescription(metadata: unknown): string {
  if (typeof metadata !== "object" || metadata === null) {
    return "Explore this collection"
  }

  const productCount = (metadata as Record<string, unknown>).product_count

  if (typeof productCount === "number") {
    return `${productCount} ${productCount === 1 ? "product" : "products"}`
  }

  if (typeof productCount === "string" && productCount.trim()) {
    return productCount.trim()
  }

  return "Explore this collection"
}

function getMetadataImage(metadata: unknown): string | undefined {
  if (typeof metadata !== "object" || metadata === null) {
    return undefined
  }

  const image = (metadata as Record<string, unknown>).image
  return typeof image === "string" && image.trim() ? image : undefined
}

export function resolveStrapiMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith("http://") || url.startsWith("https://")) return url

  const baseUrl = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`
}

export function buildCollectionContentByHandle(
  entries: CollectionDescriptionData[]
): Map<string, CollectionDescriptionData> {
  return new Map(
    entries
      .filter((entry) => entry.Handle?.trim())
      .map((entry) => [entry.Handle.toLowerCase(), entry])
  )
}

export function buildCollectionCardData(
  collections: CollectionCardSource[],
  collectionContentByHandle: Map<string, CollectionDescriptionData>
): CollectionCardData[] {
  return collections.map((collection) => {
    const cmsContent = collectionContentByHandle.get(collection.handle.toLowerCase())
    const title = cmsContent?.Title?.trim() || collection.title

    return {
      id: collection.id,
      href: `/collections/${collection.handle}`,
      title,
      description:
        cmsContent?.Description?.trim() || getFallbackDescription(collection.metadata),
      imageUrl:
        resolveStrapiMediaUrl(cmsContent?.Image?.url) ||
        getMetadataImage(collection.metadata),
      imageAlt: cmsContent?.Image?.alternativeText?.trim() || title,
      initial: title.charAt(0).toUpperCase() || "C",
    }
  })
}
