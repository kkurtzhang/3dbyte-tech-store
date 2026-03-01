"use client"

import Image from "next/image"
import Link from "next/link"
import { useRecentlyViewed } from "@/lib/hooks/use-recently-viewed"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Clock, ShoppingBag } from "lucide-react"

export function AccountRecentlyViewed() {
  const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed()

  if (recentlyViewed.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="relative mb-4">
            <div className="absolute -inset-4 rounded-full bg-primary/5 blur-2xl" />
            <Clock className="relative h-12 w-12 text-muted-foreground/60" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No recently viewed products</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Products you view will appear here for easy access. Start browsing to build your history.
          </p>
          <Button asChild className="mt-4">
            <Link href="/shop">Browse Products</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Recently Viewed</CardTitle>
          <span className="text-sm text-muted-foreground">({recentlyViewed.length})</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearRecentlyViewed}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clear History
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {recentlyViewed.slice(0, 20).map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.handle}`}
              className="group block"
            >
              <div className="aspect-square rounded-md overflow-hidden bg-muted relative mb-2">
                {product.thumbnail ? (
                  <Image
                    src={product.thumbnail}
                    alt={product.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <ShoppingBag className="h-8 w-8" />
                  </div>
                )}
              </div>
              <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                {product.title}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {new Intl.NumberFormat("en-AU", {
                  style: "currency",
                  currency: product.currencyCode,
                }).format(product.price)}
              </p>
            </Link>
          ))}
        </div>

        {recentlyViewed.length > 20 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Showing 20 of {recentlyViewed.length} products
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
