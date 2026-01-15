"use client"

import { useState, useEffect, useMemo } from "react"
import { StoreProduct, StoreProductVariant } from "@medusajs/types"
import { ProductGallery } from "../components/product-gallery"
import { ProductActions } from "../components/product-actions"
import { SpecSheet } from "../components/spec-sheet"
import { Separator } from "@/components/ui/separator"
import { useQueryState } from "nuqs"

interface ProductTemplateProps {
  product: StoreProduct
  richDescription?: string // From Strapi
}

export function ProductTemplate({ product, richDescription }: ProductTemplateProps) {
  const [variantId, setVariantId] = useQueryState("variant", {
    shallow: false,
    history: "push",
  })

  const [options, setOptions] = useState<Record<string, string>>({})

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

    // If we have a selected variant (from URL), sync options to it
    if (selectedVariant) {
      const variantOptions: Record<string, string> = {}
      selectedVariant.options?.forEach((opt) => {
        if (opt.option_id && opt.value) {
          variantOptions[opt.option_id] = opt.value
        }
      })

      // Only update if different to avoid infinite loops
      if (JSON.stringify(variantOptions) !== JSON.stringify(options)) {
        setOptions(variantOptions)
      }
    }
    // If no variant selected (no URL param), default to first variant
    else if (!variantId) {
      const firstVariant = product.variants[0]
      setVariantId(firstVariant.id)
      // Options will be synced in the next render cycle when selectedVariant updates
    }
  }, [product.variants, selectedVariant, variantId, setVariantId, options])

  const handleVariantChange = (variant: StoreProductVariant | undefined) => {
    if (variant) {
      setVariantId(variant.id)
    } else {
      setVariantId(null)
    }
  }

  // Extract specs for the SpecSheet
  // In a real app, these might come from product metadata or a dedicated Strapi content type
  const specs = [
    { label: "Material", value: product.material || "N/A" },
    { label: "Weight", value: product.weight ? `${product.weight}g` : "N/A" },
    { label: "Origin", value: product.origin_country ? product.origin_country.toUpperCase() : "N/A" },
    { label: "Type", value: product.type?.value || "Standard" },
  ]

  // Filter out empty specs
  const validSpecs = specs.filter(s => s.value !== "N/A")

  return (
    <div className="container py-8 md:py-12">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-16">
        {/* Left Column: Gallery */}
        <div className="relative">
           <div className="sticky top-24">
             <ProductGallery
                images={product.images || []}
                selectedVariantId={selectedVariant?.id}
             />
           </div>
        </div>

        {/* Right Column: Details & Actions */}
        <div className="flex flex-col gap-8">
           <ProductActions
              product={product}
              selectedVariant={selectedVariant}
              onVariantChange={handleVariantChange}
              options={options}
              setOptions={setOptions}
           />

           <Separator />

           {/* Technical Specs */}
           {validSpecs.length > 0 && (
             <SpecSheet specs={validSpecs} />
           )}

           {/* Rich Description from Strapi (if available) */}
           {richDescription && (
             <div className="prose prose-sm dark:prose-invert">
                <h3>Product_Analysis</h3>
                <div dangerouslySetInnerHTML={{ __html: richDescription }} />
             </div>
           )}
        </div>
      </div>
    </div>
  )
}
