"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { StoreProduct } from "@medusajs/types"
import { Button } from "@/components/ui/button"
import { Check, ShoppingCart, Loader2, Package } from "lucide-react"
import { useCart } from "@/context/cart-context"
import { getFrequentlyBoughtTogetherAction } from "@/app/actions/products"

interface FrequentlyBoughtTogetherProps {
  productId: string
}

export function FrequentlyBoughtTogether({ productId }: FrequentlyBoughtTogetherProps) {
  const { addItem } = useCart()
  const [relatedProducts, setRelatedProducts] = useState<StoreProduct[]>([])
  const [mainProduct, setMainProduct] = useState<StoreProduct | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)

  useEffect(() => {
    async function fetchRelatedProducts() {
      setIsLoading(true)
      try {
        const products = await getFrequentlyBoughtTogetherAction(productId, 4)
        setRelatedProducts(products)
        setSelectedProducts(new Set(products.map((p) => p.id)))
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

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  // Get the first variant for each product (simplified)
  const getVariantId = (product: StoreProduct) => {
    return product.variants?.[0]?.id
  }

  const getPrice = (product: StoreProduct) => {
    const variant = product.variants?.[0]
    // Try calculated_price first, then fall back to prices
    const price = variant?.calculated_price?.calculated_amount || 
      (variant as any)?.prices?.[0]?.amount ||
      (variant as any)?.originalPrice ? (variant as any).originalPrice * 100 : 0
    return price ? price / 100 : 0
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(price)
  }

  const handleAddAllToCart = async () => {
    setIsAddingToCart(true)
    try {
      // Add selected related products
      for (const product of relatedProducts) {
        if (selectedProducts.has(product.id)) {
          const variantId = getVariantId(product)
          if (variantId) {
            await addItem(variantId, 1)
          }
        }
      }

      setAddedToCart(true)
      setTimeout(() => setAddedToCart(false), 2000)
    } catch (error) {
      console.error("Failed to add items to cart:", error)
    } finally {
      setIsAddingToCart(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mt-12 border rounded-lg p-6 bg-muted/30">
        <div className="flex items-center gap-2 mb-6">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Frequently Bought Together</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading recommendations...</span>
        </div>
      </div>
    )
  }

  if (relatedProducts.length === 0) {
    return null
  }

  const selectedCount = selectedProducts.size

  return (
    <div className="mt-12 border rounded-lg p-6 bg-muted/30">
      <div className="flex items-center gap-2 mb-6">
        <Package className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Frequently Bought Together</h2>
      </div>

      {/* Related Products */}
      <div className="space-y-3 mb-6">
        {relatedProducts.map((product) => (
          <div
            key={product.id}
            className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
              selectedProducts.has(product.id)
                ? "bg-background border-primary/50 shadow-sm"
                : "bg-background/50 border-border hover:border-primary/30"
            }`}
            onClick={() => toggleProduct(product.id)}
          >
            <div
              className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                selectedProducts.has(product.id)
                  ? "bg-primary border-primary"
                  : "border-muted-foreground"
              }`}
            >
              {selectedProducts.has(product.id) && (
                <Check className="h-3 w-3 text-primary-foreground" />
              )}
            </div>
            <Link
              href={`/products/${product.handle}`}
              className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-muted"
              onClick={(e) => e.stopPropagation()}
            >
              {product.thumbnail ? (
                <Image
                  src={product.thumbnail}
                  alt={product.title}
                  fill
                  className="object-cover hover:scale-105 transition-transform"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                  No image
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                href={`/products/${product.handle}`}
                className="text-sm font-medium hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="truncate">{product.title}</h3>
              </Link>
              <p className="text-sm text-muted-foreground">
                {product.variants?.[0]?.title || "Default"}
              </p>
              <p className="text-sm font-semibold">{formatPrice(getPrice(product))}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add All Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{selectedCount}</span> item
          {selectedCount !== 1 ? "s" : ""} selected
        </div>
        <Button
          onClick={handleAddAllToCart}
          disabled={isAddingToCart || selectedCount === 0}
          className="w-full sm:w-auto min-w-[200px]"
        >
          {isAddingToCart ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : addedToCart ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Added to Cart!
            </>
          ) : (
            <>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add {selectedCount} Item{selectedCount !== 1 ? "s" : ""} to Cart
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
