"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { StoreProduct } from "@medusajs/types"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ShoppingCart, Loader2, Sparkles } from "lucide-react"
import { useCart } from "@/context/cart-context"
import { getYouMayAlsoLikeAction } from "@/app/actions/products"
import { cn } from "@/lib/utils"

interface YouMayAlsoLikeProps {
  productId: string
}

export function YouMayAlsoLike({ productId }: YouMayAlsoLikeProps) {
  const { addItem } = useCart()
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  useEffect(() => {
    async function fetchRelatedProducts() {
      setIsLoading(true)
      try {
        const fetchedProducts = await getYouMayAlsoLikeAction(productId, 10)
        // Filter out current product
        const filtered = fetchedProducts.filter((p) => p.id !== productId)
        setProducts(filtered)
      } catch (error) {
        console.error("Failed to fetch related products:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (productId) {
      fetchRelatedProducts()
    }
  }, [productId])

  // Check scroll position to update arrow visibility
  const checkScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (scrollContainer) {
      checkScroll()
      scrollContainer.addEventListener("scroll", checkScroll)
      return () => scrollContainer.removeEventListener("scroll", checkScroll)
    }
  }, [products])

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return
    const scrollAmount = 280 // Card width + gap
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  // Get the first variant for each product
  const getVariantId = (product: StoreProduct) => {
    return product.variants?.[0]?.id
  }

  const getPrice = (product: StoreProduct) => {
    const variant = product.variants?.[0]
    // Note: Medusa v2 returns prices in dollars, not cents
    const price = variant?.calculated_price?.calculated_amount ||
      (variant as any)?.prices?.[0]?.amount ||
      (variant as any)?.salePrice || 0
    return price || 0
  }

  const getOriginalPrice = (product: StoreProduct) => {
    const variant = product.variants?.[0]
    const origPrice = (variant as any)?.originalPrice
    if (origPrice) return origPrice
    const calcPrice = variant?.calculated_price?.calculated_amount
    const orig = (variant as any)?.calculated_price?.original_amount
    if (calcPrice && orig && orig > calcPrice) {
      return orig
    }
    return null
  }

  const getDiscount = (product: StoreProduct) => {
    const variant = product.variants?.[0]
    const discount = (variant as any)?.discountPercentage
    return discount || null
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(price)
  }

  const handleAddToCart = async (product: StoreProduct, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const variantId = getVariantId(product)
    if (!variantId) return

    setAddingToCartId(product.id)
    try {
      await addItem(variantId, 1)
    } catch (error) {
      console.error("Failed to add to cart:", error)
    } finally {
      setAddingToCartId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="mt-12">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">You May Also Like</h2>
        </div>
        <div className="flex items-center justify-center py-12 bg-muted/30 rounded-lg border">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading recommendations...</span>
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return null
  }

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">You May Also Like</h2>
        </div>
        
        {/* Navigation Arrows */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full",
              !canScrollLeft && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full",
              !canScrollRight && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Horizontal Scroll Container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((product) => {
          const price = getPrice(product)
          const originalPrice = getOriginalPrice(product)
          const discount = getDiscount(product)
          const isAdding = addingToCartId === product.id

          return (
            <div
              key={product.id}
              className="flex-shrink-0 w-[260px] snap-start"
            >
              <Link href={`/products/${product.handle}`}>
                <div className="group relative flex flex-col overflow-hidden border rounded-lg bg-card transition-all hover:shadow-md hover:border-primary/50">
                  {/* Image Container */}
                  <div className="relative aspect-square overflow-hidden bg-secondary/20">
                    {product.thumbnail ? (
                      <Image
                        src={product.thumbnail}
                        alt={product.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="260px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted-foreground">
                        NO_IMAGE
                      </div>
                    )}

                    {/* Discount Badge */}
                    {discount && discount > 0 && (
                      <div className="absolute left-2 top-2">
                        <span className="bg-red-500 text-white px-2 py-0.5 text-xs font-mono font-bold rounded">
                          -{Math.round(discount)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex flex-col p-4">
                    <h3 className="line-clamp-2 text-sm font-medium leading-tight mb-2 group-hover:text-primary transition-colors">
                      {product.title}
                    </h3>

                    <div className="mt-auto">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-mono font-bold text-sm">
                          {formatPrice(price)}
                        </span>
                        {originalPrice && (
                          <span className="font-mono text-xs text-muted-foreground line-through">
                            {formatPrice(originalPrice)}
                          </span>
                        )}
                      </div>

                      <Button
                        size="sm"
                        className="w-full"
                        onClick={(e) => handleAddToCart(product, e)}
                        disabled={isAdding || !getVariantId(product)}
                      >
                        {isAdding ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Add to Cart
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
