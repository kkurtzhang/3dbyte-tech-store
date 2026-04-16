import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ProductTemplate } from "@/features/product/templates/product-template"
import { loadProductPageData } from "@/features/product/lib/load-product-page-data"
import { getBundleLink } from "@/lib/medusa/bundles"
import { getProductByHandle } from "@/lib/medusa/products"

export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params
  const product = await getProductByHandle(handle)

  if (!product || !getBundleLink(product)) {
    return {
      title: "Bundle Not Found",
    }
  }

  return {
    title: `${product.title} Bundle | 3D Byte Tech Store`,
    description: product.description,
    openGraph: {
      title: `${product.title} Bundle`,
      description: product.description || undefined,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function BundleProductPage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const pageData = await loadProductPageData(handle)

  if (!pageData || !pageData.bundleLink || !pageData.bundleProduct) {
    notFound()
  }

  return (
    <Suspense
      fallback={
        <div className="container py-12 animate-pulse">
          <div className="h-96 rounded-sm bg-muted"></div>
        </div>
      }
    >
      <ProductTemplate
        product={pageData.product}
        richDescription={pageData.richDescription}
        variantImageUrls={pageData.variantImageUrls}
        bundleProduct={pageData.bundleProduct}
        availableInBundles={pageData.availableInBundles}
      />
    </Suspense>
  )
}
