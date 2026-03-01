"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { useState, useEffect, useMemo } from "react"
import { StoreProduct, StoreProductVariant } from "@medusajs/types"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface ImageItem {
  id: string
  url: string
  alt?: string
  variantId?: string
}

interface ProductGalleryProps {
  product: StoreProduct
  selectedVariant?: StoreProductVariant | null
  variantImageUrls?: string[]
}

export function ProductGallery({ product, selectedVariant, variantImageUrls }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Build images from product and variantImageUrls (JSON strings from SSR)
  const images = useMemo(() => {
    const allImages: ImageItem[] = []
    const existingUrls = new Set<string>()

    // Add product images
    product.images?.forEach((img) => {
      const url = typeof img.url === "string" ? img.url : String(img.url)
      if (!existingUrls.has(url)) {
        existingUrls.add(url)
        allImages.push({
          id: img.id,
          url,
          alt: product.title,
          variantId: undefined,
        })
      }
    })

    // Add variant images from JSON strings
    variantImageUrls?.forEach((jsonStr) => {
      try {
        const img = JSON.parse(jsonStr)
        if (!existingUrls.has(img.url)) {
          existingUrls.add(img.url)
          allImages.push({
            id: img.id,
            url: img.url,
            alt: "Variant image",
            variantId: img.variantId,
          })
        }
      } catch (e) {
        // Skip invalid JSON
      }
    })

    return allImages
  }, [product, variantImageUrls])

  // Auto-select first variant image when variant changes
  useEffect(() => {
    if (selectedVariant?.id && images.length) {
      const firstVariantImage = images.find((img) => img.variantId === selectedVariant.id)
      if (firstVariantImage) {
        const index = images.findIndex((img) => img.id === firstVariantImage.id)
        if (index !== -1 && index !== selectedIndex) {
          setSelectedIndex(index)
        }
      }
    }
  }, [selectedVariant?.id, images])

  const canScroll = images.length > 5

  const scrollThumbnails = (direction: "left" | "right") => {
    const container = document.querySelector(".thumbnail-scroll")
    if (container) {
      const scrollAmount = 88
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  if (!images.length) {
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
        <p className="text-sm font-medium">No images available</p>
        <p className="text-xs text-muted-foreground mt-1">Check back later for product photos</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image */}
      <div className="relative aspect-square overflow-hidden rounded-sm border bg-background">
        <Image
          src={images[selectedIndex]?.url || "/placeholder.png"}
          alt={images[selectedIndex]?.alt || "Product image"}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
              disabled={selectedIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelectedIndex((i) => Math.min(images.length - 1, i + 1))}
              disabled={selectedIndex === images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Image Counter */}
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-background/80 text-xs font-medium">
              {selectedIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="relative">
          {/* Scroll Left */}
          {canScroll && (
            <button
              onClick={() => scrollThumbnails("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-background shadow-md hover:bg-background/90"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div className="thumbnail-scroll flex gap-2 overflow-x-auto pb-2 px-6 scrollbar-hide">
            {images.map((image, index) => {
              const isVariantImage = image.variantId === selectedVariant?.id
              const isSelected = selectedIndex === index
              const shouldHighlight = selectedVariant && isVariantImage

              return (
                <button
                  key={image.id}
                  onClick={() => setSelectedIndex(index)}
                  className={cn(
                    "relative h-20 w-20 flex-none overflow-hidden rounded-sm border-2 bg-background transition-all",
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : shouldHighlight
                      ? "border-green-500 ring-2 ring-green-500/20"
                      : "border-input hover:border-primary/50"
                  )}
                  aria-label={`View image ${index + 1}`}
                >
                  <Image
                    src={image.url}
                    alt={image.alt || "Thumbnail"}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                  {shouldHighlight && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-[8px] px-1">
                      {selectedVariant.title?.split(" ")[0]}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Scroll Right */}
          {canScroll && (
            <button
              onClick={() => scrollThumbnails("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-background shadow-md hover:bg-background/90"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
