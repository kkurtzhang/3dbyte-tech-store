import { notFound } from "next/navigation"
import { getProductByHandle, getProductHandles } from "@/lib/medusa/products"
import { getStrapiContent } from "@/lib/strapi/content"
import { ProductTemplate } from "@/features/product/templates/product-template"
import { Metadata } from "next"
import { Suspense } from "react"
import type { ProductSourceContext } from "@/features/product/lib/product-detail-content"

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
  medusa_product_id: string
  product_handle: string
  rich_description: string
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
  searchParams,
}: {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ from?: string; fromLabel?: string }>
}) {
  const { handle } = await params
  const { from, fromLabel } = await searchParams

  const product = await getProductByHandle(handle)

  if (!product) {
    notFound()
  }

  const strapiData = await getStrapiContent<StrapiResponse<StrapiProductDescription>>(
    "product-descriptions",
    {
      filters: {
        medusa_product_id: {
          $eq: product.id,
        },
      },
      pagination: {
        page: 1,
        pageSize: 1,
      },
    }
  ).catch(() => ({ data: [] }))
  
  // Extract variant image URLs as simple string array (survives SSR serialization)
  const variantImageUrls = product.variants?.flatMap((variant) =>
    (variant.images || []).map((img) =>
      JSON.stringify({ id: img.id, url: String(img.url), variantId: variant.id })
    )
  ) || []

  const enrichedContent = strapiData?.data?.[0]
  const sourceContext: ProductSourceContext | null =
    from && fromLabel
      ? {
          href: from,
          label: fromLabel,
        }
      : null

  return (
    <Suspense fallback={<div className="container py-12 animate-pulse"><div className="h-96 bg-muted rounded-sm"></div></div>}>
      <ProductTemplate
        product={product}
        richDescription={enrichedContent?.rich_description}
        variantImageUrls={variantImageUrls}
        sourceContext={sourceContext}
      />
    </Suspense>
  )
}
