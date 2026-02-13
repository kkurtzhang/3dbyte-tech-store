"use client"

import Image from "next/image"
import Link from "next/link"
import { Heart, Trash2, ShoppingCart, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWishlist, WishlistItem } from "@/context/wishlist-context"
import { toast } from "@/lib/hooks/use-toast"

export function WishlistClient() {
  const { wishlist, isLoading, removeFromWishlist, moveToCart, clearWishlist } = useWishlist()

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const handleRemoveFromWishlist = (id: string) => {
    removeFromWishlist(id)
    toast({
      title: "Removed from wishlist",
      description: "Item has been removed from your wishlist",
    })
  }

  const handleMoveToCart = async (item: WishlistItem) => {
    try {
      await moveToCart(item)
      toast({
        title: "Added to cart",
        description: "Item moved from wishlist to cart",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      })
    }
  }

  const handleClearAll = () => {
    clearWishlist()
    toast({
      title: "Wishlist cleared",
      description: "All items have been removed from your wishlist",
    })
  }

  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading wishlist...</p>
          </div>
        </div>
      </div>
    )
  }

  if (wishlist.length === 0) {
    return (
      <div className="container py-12">
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Heart className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">Your wishlist is empty</h1>
          <p className="mb-6 max-w-md text-muted-foreground">
            Save items you love by clicking the heart icon on any product page.
          </p>
          <Link href="/shop">
            <Button className="gap-2">
              Start Shopping
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">My Wishlist</h1>
          <p className="font-mono text-sm text-muted-foreground">
            {wishlist.length} {wishlist.length === 1 ? "item" : "items"} saved
          </p>
        </div>
        {wishlist.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="text-muted-foreground hover:text-destructive"
          >
            Clear All
          </Button>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {wishlist.map((item) => (
          <div
            key={item.id}
            className="group relative flex flex-col overflow-hidden border bg-card transition-colors hover:border-primary/50"
          >
            {/* Product Image */}
            <Link href={`/products/${item.handle}`} className="relative aspect-square overflow-hidden bg-secondary/20">
              {item.thumbnail ? (
                <Image
                  src={item.thumbnail}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted-foreground">
                  NO_IMAGE
                </div>
              )}
            </Link>

            {/* Product Info */}
            <div className="flex flex-1 flex-col p-4">
              <div className="mb-3 flex-1">
                <Link
                  href={`/products/${item.handle}`}
                  className="line-clamp-2 text-sm font-medium leading-tight group-hover:text-primary transition-colors"
                >
                  {item.title}
                </Link>
              </div>

              <div className="mb-3 font-mono text-sm font-bold tracking-tight">
                {formatPrice(item.price.amount, item.price.currency_code)}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => handleMoveToCart(item)}
                  disabled={!item.variantId}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveFromWishlist(item.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Remove button on top right for quick access */}
            <button
              onClick={() => handleRemoveFromWishlist(item.id)}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 p-0 opacity-0 transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
              aria-label="Remove from wishlist"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
