"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

interface ProductGalleryProps {
  images: {
    id: string
    url: string
    alt?: string
  }[]
  selectedVariantId?: string
}

export function ProductGallery({ images, selectedVariantId }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Reset to first image when variant changes, or if we had a way to map variant -> image
  // we would select that specific image.
  // For 'The Lab' aesthetic, we might want a glitch effect here later.
  useEffect(() => {
    setSelectedIndex(0)
  }, [selectedVariantId])

  const displayImages = images


  if (!displayImages || displayImages.length === 0) {
    return (
      <div className="aspect-square flex items-center justify-center bg-secondary/20 border rounded-sm font-mono text-muted-foreground">
        NO_IMAGE_DATA
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image */}
      <div className="relative aspect-square overflow-hidden rounded-sm border bg-background">
        <Image
          src={displayImages[selectedIndex].url}
          alt={displayImages[selectedIndex].alt || "Product image"}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {displayImages.map((image, index) => (
          <button
            key={image.id}
            onClick={() => setSelectedIndex(index)}
            className={cn(
              "relative h-20 w-20 flex-none overflow-hidden rounded-sm border bg-background transition-all",
              selectedIndex === index
                ? "ring-2 ring-primary ring-offset-2 border-transparent"
                : "border-input hover:border-primary/50"
            )}
          >
            <Image
              src={image.url}
              alt={image.alt || "Thumbnail"}
              fill
              className="object-cover"
              sizes="80px"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
