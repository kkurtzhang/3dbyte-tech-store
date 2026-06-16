import { notFound } from "next/navigation"
import { getProductByHandle, getProductHandles } from "@/lib/medusa/products"
import { ProductTemplate } from "@/features/product/templates/product-template"
import { loadProductPageData } from "@/features/product/lib/load-product-page-data"
import { Metadata } from "next"
import type { ProductSourceContext } from "@/features/product/lib/product-detail-content"
import { getPricingContext } from "@/lib/medusa/regions.server"

// Revalidate every hour
export const revalidate = 3600
export const dynamic = "force-dynamic"

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
    title: product.title,
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
  searchParams,
}: {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ from?: string; fromLabel?: string }>
}) {
  const { handle } = await params
  const { from, fromLabel } = await searchParams
  const pricing = await getPricingContext()
  const pageData = await loadProductPageData(handle, pricing)

  if (!pageData) {
    notFound()
  }

  const sourceContext: ProductSourceContext | null =
    from && fromLabel
      ? {
          href: from,
          label: fromLabel,
        }
      : null

  return (
    <ProductTemplate
      product={pageData.product}
      richDescription={pageData.richDescription}
      variantImageUrls={pageData.variantImageUrls}
      bundleProduct={pageData.bundleProduct}
      availableInBundles={pageData.availableInBundles}
      sourceContext={sourceContext}
      productDocuments={pageData.productDocuments}
    />
  )
}
