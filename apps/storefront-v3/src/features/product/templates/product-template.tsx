"use client"

import { useState, useEffect } from "react"
import { StoreProduct, StoreProductVariant } from "@medusajs/types"
import { ProductGallery } from "../components/product-gallery"
import { ProductActions } from "../components/product-actions"
import { SpecSheet } from "../components/spec-sheet"
import { Separator } from "@/components/ui/separator"

interface ProductTemplateProps {
  product: StoreProduct
  richDescription?: string // From Strapi
}

export function ProductTemplate({ product, richDescription }: ProductTemplateProps) {
  const [options, setOptions] = useState<Record<string, string>>({})
  const [selectedVariant, setSelectedVariant] = useState<StoreProductVariant | undefined>(undefined)

  // Initialize options from the first variant (or default behavior)
  useEffect(() => {
    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      const firstVariant = product.variants[0]
      const initialOptions: Record<string, string> = {}

      firstVariant.options?.forEach((opt) => {
        if (opt.option_id && opt.value) {
           initialOptions[opt.option_id] = opt.value
        }
      })

      setOptions(initialOptions)
      setSelectedVariant(firstVariant)
    }
  }, [product, selectedVariant])

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
              onVariantChange={setSelectedVariant}
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
