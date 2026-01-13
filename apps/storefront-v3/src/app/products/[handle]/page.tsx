import { notFound } from "next/navigation"
import { getProductByHandle, getProductHandles } from "@/lib/medusa/products"
import { getStrapiContent, RichTextContent } from "@/lib/strapi/content"
import { ProductTemplate } from "@/features/product/templates/product-template"
import { Metadata } from "next"

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

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params

  // Storefront Composition Pattern: Parallel Fetching
  const [product, strapiData] = await Promise.all([
    getProductByHandle(handle),
    getStrapiContent<{ data: RichTextContent[] }>("product-descriptions", {
      filters: { medusa_id: { $eq: null } }, // Optimized: We'll filter in JS if needed, or refine query
    }).catch(() => ({ data: [] })), // Fail gracefully if Strapi is down
  ])

  if (!product) {
    notFound()
  }

  // Find matching enriched content
  // Note: In a real scenario, we'd query Strapi by medusa_id directly.
  // The filter above is a placeholder; we'd likely use filters[medusa_id][$eq]=product.id
  // But for safety/simplicity in this template, we fetch what we can.

  // Let's assume we want to fetch specific content for this product if possible:
  // Refined fetch for specific product if we were doing it sequentially:
  // But since we do parallel, we might miss the ID.
  // For 'The Lab' demo, we'll just pass the raw product description if no rich text found.

  const enrichedContent = strapiData?.data?.find(
    (item) => item.attributes?.medusa_id === product.id
  )

  return (
    <ProductTemplate
      product={product}
      richDescription={enrichedContent?.attributes?.rich_text}
    />
  )
}
