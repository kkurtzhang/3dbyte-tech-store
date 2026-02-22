"use client"

import { StoreProduct, StoreProductVariant } from "@medusajs/types"
import { ChevronLeft, ChevronRight, Flame } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { useState, useEffect } from "react"

interface QuickViewGalleryProps {
  product: StoreProduct
  selectedVariant?: StoreProductVariant | null
  saleInfo?: { percentage: number; isHot: boolean } | null
  images?: { id: string; url: string; alt?: string }[]
}

export function QuickViewGallery({
  product,
  selectedVariant,
  saleInfo,
  images: externalImages,
}: QuickViewGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Build images from external images prop or fallback to product images
  const images = externalImages?.length
    ? externalImages
    : product.images?.map((img) => ({
        id: img.id,
        url: img.url,
        alt: product.title,
      })) ?? []

  // Auto-select variant image when selectedVariant changes
  useEffect(() => {
    if (selectedVariant?.id && images.length > 0) {
      // Find image that matches the variant's thumbnail
      const variantImageIndex = images.findIndex(
        (img) => img.url === selectedVariant.thumbnail
      )
      if (variantImageIndex !== -1 && variantImageIndex !== selectedIndex) {
        setSelectedIndex(variantImageIndex)
      }
    }
  }, [selectedVariant?.id, selectedVariant?.thumbnail, images])

  const goToPrevious = () => {
    setSelectedIndex((i) => Math.max(0, i - 1))
  }

  const goToNext = () => {
    setSelectedIndex((i) => Math.min(images.length - 1, i + 1))
  }

  // No images placeholder
  if (images.length === 0) {
    return (
      <div className="aspect-square flex flex-col items-center justify-center bg-secondary/20 border rounded-sm text-muted-foreground">
        <div className="w-16 h-16 mb-3 rounded-full bg-secondary/50 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-8 h-8"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <p className="text-sm font-medium font-mono">NO_IMAGE</p>
      </div>
    )
  }

  const hasMultipleImages = images.length > 1

  return (
    <div className="flex flex-col gap-3">
      {/* Main Image */}
      <div className="relative aspect-square overflow-hidden rounded-sm border bg-background">
        <Image
          src={images[selectedIndex]?.url || "/placeholder.png"}
          alt={images[selectedIndex]?.alt || product.title || "Product image"}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 640px) 95vw, 50vw"
        />

        {/* Sale Badge Overlay */}
        {saleInfo && saleInfo.percentage > 0 && (
          <div className="absolute left-3 top-3 flex flex-col gap-1">
            <Badge
              className={cn(
                "flex items-center gap-1 font-mono text-xs",
                saleInfo.isHot
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-primary hover:bg-primary/90"
              )}
            >
              {saleInfo.isHot && <Flame className="h-3 w-3" />}
              -{Math.round(saleInfo.percentage)}%
            </Badge>
          </div>
        )}

        {/* Navigation Arrows */}
        {hasMultipleImages && (
          <>
            <button
              onClick={goToPrevious}
              disabled={selectedIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              disabled={selectedIndex === images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Image Counter Badge */}
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-background/80 text-xs font-medium font-mono">
              {selectedIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail Strip - Hide if single image */}
      {hasMultipleImages && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-sm border-2 bg-background transition-all",
                selectedIndex === index
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-input hover:border-primary/50"
              )}
              aria-label={`View image ${index + 1}`}
            >
              <Image
                src={image.url}
                alt={image.alt || "Thumbnail"}
                fill
                className="object-cover"
                sizes="56px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
