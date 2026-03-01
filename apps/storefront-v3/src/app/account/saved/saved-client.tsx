"use client"

import { useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Bookmark, ShoppingCart, Trash2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSavedItems } from "@/context/saved-items-context"
import { useCart } from "@/context/cart-context"

export function SavedItemsClient() {
  const { savedItems, removeSavedItem, moveToCart, isLoading } = useSavedItems()
  const { addItem, isLoading: cartLoading } = useCart()

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const handleMoveToCart = async (item: typeof savedItems[0]) => {
    if (item.variant?.id) {
      await addItem(item.variant.id, item.quantity)
      moveToCart(item)
    }
  }

  const handleRemove = (itemId: string) => {
    removeSavedItem(itemId)
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center font-mono text-sm text-muted-foreground animate-pulse">
        Loading_Saved_Items...
      </div>
    )
  }

  if (savedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 text-center py-12">
        <div className="relative">
          <div className="absolute -inset-8 rounded-full bg-primary/5 blur-2xl" />
          <Bookmark className="relative h-48 w-48 text-muted-foreground/80" />
        </div>

        <div className="space-y-3 max-w-md">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            No saved items
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Save items from your cart to purchase them later. They'll appear here for easy access.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Button asChild size="lg" className="text-lg px-8">
            <Link href="/cart" className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" />
              Go to Cart
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="text-lg px-8">
            <Link href="/shop" className="flex items-center gap-2">
              Continue Shopping
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Default currency
  const currencyCode = "usd"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-mono uppercase flex items-center gap-2">
            <Bookmark className="h-6 w-6" />
            Saved Items
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {savedItems.length} item{savedItems.length !== 1 ? "s" : ""} saved for later
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/cart" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Cart
          </Link>
        </Button>
      </div>

      <Separator />

      <div className="rounded-lg border bg-card">
        <div className="divide-y">
          {savedItems.map((item) => (
            <div key={item.id} className="p-4">
              <div className="flex gap-4">
                {/* Product Image */}
                <div className="relative aspect-square h-24 w-24 min-w-[6rem] overflow-hidden rounded-sm border bg-secondary/20">
                  {item.variant?.product?.thumbnail ? (
                    <Image
                      src={item.variant.product.thumbnail}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted-foreground">
                      NO_IMG
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex flex-1 flex-col justify-between">
                  <div className="grid gap-1">
                    <h4 className="line-clamp-2 text-sm font-medium leading-tight">
                      {item.title}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {item.variant?.title !== "Default Variant" ? item.variant?.title : "Standard"}
                    </p>
                    <div className="font-mono text-sm font-medium mt-1">
                      {formatPrice(item.unit_price * item.quantity, item.unit_price > 0 ? currencyCode : "usd")}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => handleMoveToCart(item)}
                      disabled={cartLoading || !item.variant?.id}
                      className="flex items-center gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Move to Cart
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(item.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center pt-4">
        <Button asChild size="lg">
          <Link href="/shop" className="flex items-center gap-2">
            Continue Shopping
            <ArrowRight className="h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
