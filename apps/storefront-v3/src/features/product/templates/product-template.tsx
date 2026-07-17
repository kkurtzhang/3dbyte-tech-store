"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { ProductGallery } from "../components/product-gallery"
import { ProductActions } from "../components/product-actions"
import { ProductBreadcrumbs } from "../components/product-breadcrumbs"
import { ProductSupportPanel } from "../components/product-support-panel"
import { ProductDocumentsPanel } from "../components/product-documents-panel"
import { RecentlyViewedProducts } from "@/components/product/recently-viewed-products"
import { useQueryState } from "nuqs"
import { useRecentlyViewed } from "@/lib/hooks/use-recently-viewed"
import type { MedusaProduct, MedusaProductVariant } from "@/lib/medusa/types"
import type { BundleProduct } from "@/lib/medusa/bundles"
import type { PublicProductDocument } from "@/lib/product-documents/types"
import { getVariantOptionsMap } from "../lib/product-variants"
import {
  buildProductBreadcrumbs,
  type ProductSourceContext,
} from "../lib/product-detail-content"

interface ProductTemplateProps {
  product: MedusaProduct
  richDescription?: string
  variantImageUrls?: string[]
  bundleProduct?: BundleProduct | null
  availableInBundles?: BundleProduct[]
  sourceContext?: ProductSourceContext | null
  productDocuments?: PublicProductDocument[]
  readOnly?: boolean
}

function ProductRichDescription({
  richDescription,
}: {
  richDescription?: string
}) {
  if (!richDescription) {
    return null
  }

  return (
    <section className="prose prose-sm max-w-none dark:prose-invert prose-cyan prose-headings:font-semibold prose-a:text-cyan-500 hover:prose-a:text-cyan-400 rounded-sm border border-cyan-500/10 bg-slate-900/10 dark:bg-slate-950/20 p-6 shadow-[0_0_15px_rgba(6,182,212,0.02)]">
      <h3 className="mb-3 text-lg font-semibold tracking-wider font-mono text-cyan-500 uppercase">Product Description</h3>
      <div className="prose-p:leading-relaxed prose-li:my-1" dangerouslySetInnerHTML={{ __html: richDescription }} />
    </section>
  )
}

export function ProductTemplate({
  product,
  richDescription,
  variantImageUrls,
  bundleProduct,
  availableInBundles = [],
  sourceContext,
  productDocuments = [],
  readOnly = false,
}: ProductTemplateProps) {
  const [variantId, setVariantId] = useQueryState("variant", {
    shallow: false,
    history: "replace",
  })

  const [options, setOptions] = useState<Record<string, string>>({})
  const { addToRecentlyViewed } = useRecentlyViewed()

  // Track product views - only add once per visit using a ref
  const hasTrackedView = useRef(false)
  useEffect(() => {
    if (!hasTrackedView.current && product.id) {
      addToRecentlyViewed(product)
      hasTrackedView.current = true
    }
  }, [product.id, addToRecentlyViewed])

  // Derive selected variant from URL or default to first
  const selectedVariant = useMemo(() => {
    if (variantId && product.variants) {
      return product.variants.find((v) => v.id === variantId)
    }
    return undefined
  }, [product.variants, variantId])

  // Initialize or Sync options when selectedVariant changes
  // This handles both initial load (from URL) and navigation updates
  useEffect(() => {
    if (!product.variants || product.variants.length === 0) return

    if (selectedVariant) {
      const nextOptions = getVariantOptionsMap(selectedVariant)
      setOptions((currentOptions) => {
        if (JSON.stringify(currentOptions) === JSON.stringify(nextOptions)) {
          return currentOptions
        }

        return nextOptions
      })
      return
    }

    if (!variantId) {
      const firstVariant = product.variants[0]
      setVariantId(firstVariant.id)
    }
  }, [product.variants, selectedVariant, variantId, setVariantId])

  const handleVariantChange = (variant: MedusaProductVariant | undefined) => {
    if (variant) {
      setVariantId(variant.id)
    } else {
      setVariantId(null)
    }
  }


  const breadcrumbs = useMemo(
    () => buildProductBreadcrumbs(product, sourceContext),
    [product, sourceContext]
  )

  return (
    <div className="container py-8 md:py-12">
      <ProductBreadcrumbs items={breadcrumbs} sourceContext={sourceContext} />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-16">
        {/* Left Column: Gallery */}
        <div className="relative space-y-6">
           <div className="md:sticky md:top-24">
             <ProductGallery
                product={product}
                selectedVariant={selectedVariant}
                variantImageUrls={variantImageUrls}
             />
           </div>
        </div>

        {/* Right Column: Details & Actions */}
        <div className="flex flex-col gap-8">
           {readOnly ? (
             <div
               role="status"
               className="rounded-sm border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-950 dark:text-amber-100"
             >
               <p className="font-semibold">Live purchasing is temporarily paused</p>
               <p className="mt-1">
                 Live price and availability are temporarily unavailable. You can
                 still browse the cached product information, but checkout is disabled.
               </p>
             </div>
           ) : (
             <ProductActions
                product={product}
                selectedVariant={selectedVariant}
                onVariantChange={handleVariantChange}
                options={options}
                setOptions={setOptions}
                bundleProduct={bundleProduct}
                availableInBundles={availableInBundles}
             />
           )}

           <ProductSupportPanel />

           <ProductDocumentsPanel documents={productDocuments} />
        </div>
      </div>

      {richDescription && (
        <div className="mt-12 md:mt-16 border-t border-border pt-8 md:pt-12">
          <ProductRichDescription richDescription={richDescription} />
        </div>
      )}

      {/* Recently Viewed Products Section */}
      <div className="mt-12">
        <RecentlyViewedProducts currentProductId={product.id} />
      </div>
    </div>
  )
}
