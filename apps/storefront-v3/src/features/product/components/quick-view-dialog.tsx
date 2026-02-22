"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { StoreProduct } from "@medusajs/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import { useToast } from "@/lib/hooks/use-toast"
import { getProductByHandle } from "@/lib/medusa/products"
import { QuickViewGallery } from "./quick-view-gallery"
import { StockStatusBadge, getStockStatus } from "@/components/ui/stock-status-badge"
import { PriceDisplay } from "@/components/ui/price-display"
import { NotifyMeButton } from "./notify-me-button"
import { ExternalLink, ShoppingCart, Loader2, Plus, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickViewDialogProps {
  handle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Loading skeleton for the dialog content
function LoadingSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row animate-pulse">
      {/* Gallery skeleton */}
      <div className="aspect-square sm:w-1/2 bg-secondary/30 rounded-sm" />

      {/* Content skeleton */}
      <div className="flex-1 p-6 sm:p-8 space-y-4">
        <div className="h-6 bg-secondary/30 rounded w-3/4" />
        <div className="h-8 bg-secondary/30 rounded w-1/2" />
        <div className="h-4 bg-secondary/30 rounded w-1/4" />
        <div className="space-y-2 pt-4">
          <div className="h-3 bg-secondary/30 rounded w-1/3" />
          <div className="flex gap-2">
            <div className="h-10 w-16 bg-secondary/30 rounded" />
            <div className="h-10 w-16 bg-secondary/30 rounded" />
            <div className="h-10 w-16 bg-secondary/30 rounded" />
          </div>
        </div>
        <div className="pt-4 space-y-3">
          <div className="h-12 bg-secondary/30 rounded" />
          <div className="h-8 bg-secondary/30 rounded" />
        </div>
      </div>
    </div>
  )
}

// Error state component
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="rounded-full bg-destructive/10 p-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8 text-destructive"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Failed to Load Product</h3>
        <p className="text-sm text-muted-foreground">
          Unable to fetch product details. Please try again.
        </p>
      </div>
      <Button onClick={onRetry} variant="outline">
        Try Again
      </Button>
    </div>
  )
}

export function QuickViewDialog({
  handle,
  open,
  onOpenChange,
}: QuickViewDialogProps) {
  const { addItem } = useCart()
  const { toast } = useToast()

  // State management (like ProductTemplate)
  const [product, setProduct] = useState<StoreProduct | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [options, setOptions] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)

  // Fetch product when dialog opens
  useEffect(() => {
    if (open && handle) {
      setLoading(true)
      setError(false)

      getProductByHandle(handle)
        .then((fetchedProduct) => {
          if (fetchedProduct) {
            setProduct(fetchedProduct)
            // Initialize options with first variant's values
            if (fetchedProduct.variants?.[0]?.options) {
              const initialOptions: Record<string, string> = {}
              fetchedProduct.variants[0].options.forEach((opt) => {
                if (opt.option_id && opt.value) {
                  initialOptions[opt.option_id] = opt.value
                }
              })
              setOptions(initialOptions)
            }
          } else {
            setError(true)
          }
        })
        .catch(() => {
          setError(true)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [open, handle])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuantity(1)
    }
  }, [open])

  // Derived selected variant from options (reuse ProductActions logic)
  const selectedVariant = useMemo(() => {
    if (!product?.variants) return undefined

    return product.variants.find((variant) => {
      return variant.options?.every((opt) => options[opt.option_id!] === opt.value)
    })
  }, [product?.variants, options])

  // Update option handler (reuse ProductActions logic)
  const updateOption = (optionId: string, value: string) => {
    setOptions((prev) => ({ ...prev, [optionId]: value }))
  }

  // Quantity handlers
  const increaseQuantity = () => {
    const maxQuantity = selectedVariant?.inventory_quantity ?? 99
    setQuantity((q) => Math.min(q + 1, maxQuantity))
  }

  const decreaseQuantity = () => {
    setQuantity((q) => Math.max(1, q - 1))
  }

  // Handle add to cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return

    setIsAdding(true)
    try {
      await addItem(selectedVariant.id, quantity)
      toast({
        title: "Item_Acquired",
        description: `${quantity}x ${product?.title} has been added to your system inventory.`,
      })
      onOpenChange(false)
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Acquisition_Failed",
        description: "Unable to add item. Please check system connection.",
      })
    } finally {
      setIsAdding(false)
    }
  }

  // Retry fetch handler
  const handleRetry = () => {
    setLoading(true)
    setError(false)

    getProductByHandle(handle)
      .then((fetchedProduct) => {
        if (fetchedProduct) {
          setProduct(fetchedProduct)
          if (fetchedProduct.variants?.[0]?.options) {
            const initialOptions: Record<string, string> = {}
            fetchedProduct.variants[0].options.forEach((opt) => {
              if (opt.option_id && opt.value) {
                initialOptions[opt.option_id] = opt.value
              }
            })
            setOptions(initialOptions)
          }
        } else {
          setError(true)
        }
      })
      .catch(() => {
        setError(true)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  // Sale info calculation from variant prices
  const saleInfo = useMemo(() => {
    const variant = selectedVariant as Record<string, unknown> | undefined
    const calcPrice = variant?.calculated_price as Record<string, number> | undefined
    const calculatedAmount = calcPrice?.calculated_amount
    const originalAmount = calcPrice?.original_amount
    const hasDiscount = originalAmount && calculatedAmount && originalAmount > calculatedAmount
    const discountPercentage = hasDiscount
      ? Math.round((1 - calculatedAmount / originalAmount) * 100)
      : 0

    if (discountPercentage > 0) {
      return {
        percentage: discountPercentage,
        isHot: discountPercentage >= 30,
      }
    }
    return null
  }, [selectedVariant])

  // Get stock status
  const stockStatus = getStockStatus(selectedVariant)
  const isOutOfStock = stockStatus.status === "out-of-stock"
  const maxQuantity = selectedVariant?.inventory_quantity ?? 99

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full p-0 gap-0 border-border overflow-hidden">
        {/* Visually hidden title for accessibility */}
        <DialogHeader className="sr-only">
          <DialogTitle>
            Quick View: {product?.title || "Loading product..."}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState onRetry={handleRetry} />
        ) : product ? (
          <div className="flex flex-col sm:flex-row">
            {/* Gallery Section - 50% on desktop */}
            <div className="sm:w-1/2 bg-secondary/10 flex-shrink-0">
              <QuickViewGallery
                product={product}
                selectedVariant={selectedVariant}
                saleInfo={saleInfo}
              />
            </div>

            {/* Content Section - 50% on desktop */}
            <div className="flex flex-1 flex-col p-6 sm:p-8 max-h-[70vh] sm:max-h-[80vh] overflow-y-auto">
              {/* Title with link to product page */}
              <Link
                href={`/products/${handle}`}
                className="text-xl font-bold leading-tight hover:text-primary transition-colors mb-3"
                onClick={() => onOpenChange(false)}
              >
                {product.title}
              </Link>

              {/* Price Display with sale info */}
              <div className="mb-4">
                {(() => {
                  const variant = selectedVariant as Record<string, unknown> | undefined
                  const calcPrice = variant?.calculated_price as Record<string, unknown> | undefined
                  const calculatedAmount = calcPrice?.calculated_amount as number | undefined
                  const originalAmount = calcPrice?.original_amount as number | undefined
                  const prices = variant?.prices as Array<{ amount: number; currency_code: string }> | undefined

                  // Use calculated price or fall back to regular price
                  const priceAmount = calculatedAmount || originalAmount || prices?.[0]?.amount || 0
                  const currencyCode = prices?.[0]?.currency_code || "usd"

                  return (
                    <PriceDisplay
                      price={{ amount: priceAmount / 100, currency_code: currencyCode }}
                      originalPrice={originalAmount && calculatedAmount && originalAmount > calculatedAmount ? originalAmount / 100 : undefined}
                      discountPercentage={saleInfo?.percentage}
                      size="md"
                    />
                  )
                })()}
              </div>

              {/* Stock Status Badge */}
              <div className="mb-6">
                <StockStatusBadge variant={selectedVariant} />
              </div>

              {/* Variant Selectors */}
              {product.options && product.options.length > 0 && (
                <div className="space-y-4 mb-6">
                  {product.options.map((option) => (
                    <div key={option.id} className="space-y-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                        {option.title}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {option.values?.map((value) => {
                          const isSelected = options[option.id] === value.value
                          return (
                            <button
                              key={value.value}
                              onClick={() => updateOption(option.id, value.value)}
                              className={cn(
                                "px-4 py-2 text-sm border transition-all",
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary ring-1 ring-primary/50"
                                  : "bg-background hover:border-primary/50 hover:text-primary"
                              )}
                              aria-pressed={isSelected}
                              aria-label={`Select ${option.title}: ${value.value}`}
                            >
                              {value.value}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quantity Stepper */}
              {!isOutOfStock && selectedVariant && (
                <div className="mb-6">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                    Quantity
                  </span>
                  <div className="flex items-center gap-1 border rounded-sm w-fit">
                    <button
                      onClick={decreaseQuantity}
                      disabled={quantity <= 1}
                      className="p-2 hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-12 text-center font-mono font-medium">
                      {quantity}
                    </span>
                    <button
                      onClick={increaseQuantity}
                      disabled={quantity >= maxQuantity}
                      className="p-2 hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-auto flex flex-col gap-3 pt-4 border-t">
                {isOutOfStock ? (
                  <NotifyMeButton
                    productId={product.id}
                    productHandle={handle}
                    productTitle={product.title}
                    variantId={selectedVariant?.id}
                    variantTitle={selectedVariant?.title || undefined}
                  />
                ) : (
                  <Button
                    size="lg"
                    className="w-full font-mono text-lg h-14 uppercase tracking-widest"
                    disabled={!selectedVariant || isAdding}
                    onClick={handleAddToCart}
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        Add to Cart
                      </>
                    )}
                  </Button>
                )}

                {/* View Full Details Link */}
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full font-mono text-xs uppercase tracking-wider"
                >
                  <Link href={`/products/${handle}`} onClick={() => onOpenChange(false)}>
                    <ExternalLink className="mr-2 h-3 w-3" />
                    View Full Details
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
