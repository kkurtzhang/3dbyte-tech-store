import { notFound } from "next/navigation"
import { getProductByHandle, getProductHandles } from "@/lib/medusa/products"
import { getStrapiContent } from "@/lib/strapi/content"
import { ProductTemplate } from "@/features/product/templates/product-template"
import { Metadata } from "next"
import { Suspense } from "react"

// Revalidate every hour
export const revalidate = 3600

export async function generateStaticParams() {
  const handles = await getProductHandles()
  return handles.map((handle) => ({
    handle,
  }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params
  const product = await getProductByHandle(handle)

  if (!product) {
    return {
      title: "Product Not Found",
    }
  }

  return {
    title: `${product.title} | 3D Byte Tech Store`,
    description: product.description,
    openGraph: {
      title: product.title,
      description: product.description || undefined,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

// Strapi v4 content type
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

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params

  // Storefront Composition Pattern: Parallel Fetching
  const [product, strapiData] = await Promise.all([
    getProductByHandle(handle),
    getStrapiContent<StrapiResponse<StrapiProductDescription>>("product-descriptions", {
      filters: { medusa_id: { $eq: null } }, // Optimized: We'll filter in JS if needed, or refine query
    }).catch(() => ({ data: [] })), // Fail gracefully if Strapi is down
  ])

  if (!product) {
    notFound()
  }
  
  // Extract variant image URLs as simple string array (survives SSR serialization)
  const variantImageUrls = product.variants?.flatMap((variant) =>
    (variant.images || []).map((img) =>
      JSON.stringify({ id: img.id, url: String(img.url), variantId: variant.id })
    )
  ) || []

  // Find matching enriched content
  const enrichedContent = strapiData?.data?.find(
    (item) => item.medusa_id === product.id
  )

  return (
    <Suspense fallback={<div className="container py-12 animate-pulse"><div className="h-96 bg-muted rounded-sm"></div></div>}>
      <ProductTemplate
        product={product}
        richDescription={enrichedContent?.rich_text}
        variantImageUrls={variantImageUrls}
      />
    </Suspense>
  )
}
