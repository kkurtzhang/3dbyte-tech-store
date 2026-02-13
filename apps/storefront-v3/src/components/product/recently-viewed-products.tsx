"use client"

import Image from "next/image"
import Link from "next/link"
import { useRecentlyViewed } from "@/lib/hooks/use-recently-viewed"
import { Button } from "@/components/ui/button"
import { Trash2, Clock } from "lucide-react"
import { useState } from "react"

interface RecentlyViewedProductsProps {
  currentProductId?: string
}

export function RecentlyViewedProducts({ currentProductId }: RecentlyViewedProductsProps) {
  const { recentlyViewed, removeFromRecentlyViewed, clearRecentlyViewed, addToRecentlyViewed } = useRecentlyViewed()
  const [isExpanded, setIsExpanded] = useState(false)

  // Filter out current product if provided
  const filteredProducts = currentProductId
    ? recentlyViewed.filter((item) => item.id !== currentProductId)
    : recentlyViewed

  if (filteredProducts.length === 0) {
    return null
  }

  const displayCount = isExpanded ? filteredProducts.length : Math.min(4, filteredProducts.length)

  // Memoize the click handler
  const handleProductClick = (product: any) => () => {
    // Re-add to recently viewed when clicking (moves to top)
    addToRecentlyViewed({
      id: product.id,
      handle: product.handle,
      title: product.title,
      thumbnail: product.thumbnail,
      variants: [],
    } as any)
  }

  return (
    <div className="mt-8 border rounded-lg p-6 bg-muted/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Recently Viewed</h2>
          <span className="text-sm text-muted-foreground">({filteredProducts.length})</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearRecentlyViewed}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {filteredProducts.slice(0, displayCount).map((product) => (
          <div key={product.id} className="group relative">
            <Link
              href={`/products/${product.handle}`}
              className="block"
              onClick={handleProductClick(product)}
            >
              <div className="aspect-square rounded-md overflow-hidden bg-muted relative">
                {product.thumbnail ? (
                  <Image
                    src={product.thumbnail}
                    alt={product.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
              <h3 className="mt-2 text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                {product.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {new Intl.NumberFormat("en-AU", {
                  style: "currency",
                  currency: product.currencyCode,
                }).format(product.price / 100)}
              </p>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
              onClick={(e) => {
                e.preventDefault()
                removeFromRecentlyViewed(product.id)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {filteredProducts.length > 4 && (
        <div className="mt-4 text-center">
          <Button
            variant="link"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Show less" : `View all ${filteredProducts.length} products`}
          </Button>
        </div>
      )}
    </div>
  )
}
