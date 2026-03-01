"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ArrowRight, X, Check, ArrowRightLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCompare } from "@/context/compare-context"
import { toast } from "@/lib/hooks/use-toast"

export function CompareClient() {
  const { compareList, isLoading, removeFromCompare, clearCompare } = useCompare()

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const handleRemove = (id: string) => {
    removeFromCompare(id)
    toast({
      title: "Removed from comparison",
      description: "Product has been removed from comparison",
    })
  }

  const handleClearAll = () => {
    clearCompare()
    toast({
      title: "Comparison cleared",
      description: "All products have been removed from comparison",
    })
  }

  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading comparison...</p>
          </div>
        </div>
      </div>
    )
  }

  if (compareList.length === 0) {
    return (
      <div className="container py-12">
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <ArrowRight className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">No products to compare</h1>
          <p className="mb-6 max-w-md text-muted-foreground">
            Add products to compare by clicking the "Compare" button on any product card. You can compare up to 4 products at a time.
          </p>
          <Link href="/shop">
            <Button className="gap-2">
              Browse Products
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Collect all unique spec labels across all products
  const allSpecLabels = Array.from(
    new Set(compareList.flatMap((product) => product.specs?.map((spec) => spec.label) || []))
  )

  return (
    <div className="container py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/shop" className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shop
          </Link>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">Product Comparison</h1>
          <p className="font-mono text-sm text-muted-foreground">
            Comparing {compareList.length} product{compareList.length !== 1 ? "s" : ""}
          </p>
        </div>
        {compareList.length > 0 && (
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

      {/* Comparison Table - Responsive Scroll */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-4 text-left text-sm font-medium text-muted-foreground min-w-[150px]">
                Feature
              </th>
              {compareList.map((product) => (
                <th key={product.id} className="p-4 min-w-[280px]">
                  <div className="relative">
                    <button
                      onClick={() => handleRemove(product.id)}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background border shadow-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      aria-label={`Remove ${product.title} from comparison`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <Link href={`/products/${product.handle}`}>
                      <div className="relative aspect-square w-full max-w-[200px] mx-auto mb-4 overflow-hidden rounded bg-secondary/20">
                        {product.thumbnail ? (
                          <Image
                            src={product.thumbnail}
                            alt={product.title}
                            fill
                            className="object-cover transition-transform hover:scale-105"
                            sizes="200px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted-foreground">
                            NO_IMAGE
                          </div>
                        )}
                      </div>
                      <p className="font-medium text-sm leading-tight hover:text-primary transition-colors line-clamp-2">
                        {product.title}
                      </p>
                    </Link>
                    <p className="mt-2 font-mono text-lg font-bold">
                      {formatPrice(product.price.amount, product.price.currency_code)}
                    </p>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allSpecLabels.map((label) => (
              <tr key={label} className="border-b hover:bg-muted/30 transition-colors">
                <td className="p-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
                  {label}
                </td>
                {compareList.map((product) => {
                  const spec = product.specs?.find((s) => s.label === label)
                  return (
                    <td key={product.id} className="p-4">
                      {spec ? (
                        <span className="font-mono text-sm">{spec.value}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View - Stacked Cards */}
      <div className="mt-8 lg:hidden">
        <h2 className="mb-4 text-lg font-semibold">Detailed Comparison</h2>
        <div className="space-y-4">
          {compareList.map((product) => (
            <div key={product.id} className="rounded-lg border p-4">
              <div className="mb-4 flex items-start justify-between">
                <Link href={`/products/${product.handle}`} className="flex-1">
                  <div className="mb-3 flex gap-4">
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded bg-secondary/20">
                      {product.thumbnail ? (
                        <Image
                          src={product.thumbnail}
                          alt={product.title}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted-foreground">
                          NO_IMAGE
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{product.title}</h3>
                      <p className="mt-1 font-mono text-lg font-bold">
                        {formatPrice(product.price.amount, product.price.currency_code)}
                      </p>
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => handleRemove(product.id)}
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={`Remove ${product.title} from comparison`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {product.specs && product.specs.length > 0 ? (
                <div className="space-y-2">
                  {product.specs.map((spec, idx) => (
                    <div key={idx} className="flex justify-between text-sm border-b pb-2 last:border-0">
                      <span className="text-muted-foreground">{spec.label}</span>
                      <span className="font-mono">{spec.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No specifications available</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add More Products CTA */}
      {compareList.length < 4 && (
        <div className="mt-12 text-center">
          <Link href="/shop">
            <Button variant="outline" size="lg" className="gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Add More Products to Compare
            </Button>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            You can compare up to 4 products at a time
          </p>
        </div>
      )}
    </div>
  )
}
