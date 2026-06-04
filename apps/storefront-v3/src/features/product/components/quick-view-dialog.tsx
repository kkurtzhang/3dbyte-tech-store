"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import { useToast } from "@/lib/hooks/use-toast"
import { QuickViewGallery } from "./quick-view-gallery"
import { StockStatusBadge, getStockStatus } from "@/components/ui/stock-status-badge"
import { PriceDisplay } from "@/components/ui/price-display"
import { formatCustomerPrice } from "@/lib/pricing/customer-pricing"
import { getProductPath } from "@/lib/medusa/bundles"
import { NotifyMeButton } from "./notify-me-button"
import { ExternalLink, ShoppingCart, Loader2, Plus, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MedusaProduct, MedusaProductVariantWithPreorder } from "@/lib/medusa/types"
import { isPreorder } from "@/lib/util/is-preorder"
import { getVariantPriceDisplay, resolvePreorderPrice } from "@/lib/util/preorder-pricing"
import {
  findVariantMatchingOptions,
  getDisplayableProductOptions,
  getVariantOptionsMap,
} from "../lib/product-variants"
import {
  buildQuickViewBundleItems,
  buildQuickViewDetailChips,
  buildQuickViewPreviewProduct,
  buildQuickViewSummary,
  mergeQuickViewProductData,
  type QuickViewProductPreview,
} from "../lib/quick-view-product"

interface QuickViewDialogProps {
  handle: string
  open: boolean
  onOpenChange: (open: boolean) => void
  productPreview?: QuickViewProductPreview
  sourceHref?: string
  sourceLabel?: string
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
  productPreview,
  sourceHref,
  sourceLabel,
}: QuickViewDialogProps) {
  const { addItem } = useCart()
  const { toast } = useToast()
  const previewProduct = useMemo(
    () => (productPreview ? buildQuickViewPreviewProduct(productPreview) : null),
    [productPreview]
  )

  // State management (like ProductTemplate)
  const [product, setProduct] = useState<MedusaProduct | null>(previewProduct)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [options, setOptions] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const displayableOptions = useMemo(
    () => getDisplayableProductOptions(product?.options ?? null),
    [product?.options]
  )

  useEffect(() => {
    setProduct(previewProduct)
    setOptions(getVariantOptionsMap(previewProduct?.variants?.[0]))
  }, [previewProduct])

  const fetchProduct = async () => {
    const response = await fetch(
      `/api/products/by-handle/${encodeURIComponent(handle)}`,
      {
        cache: "no-store",
      }
    )

    if (!response.ok) {
      throw new Error("Failed to load quick view product")
    }

    const data = (await response.json()) as { product?: MedusaProduct }
    if (!data.product) {
      throw new Error("Quick view product missing from response")
    }

    return data.product
  }

  // Fetch product when dialog opens
  useEffect(() => {
    if (!open || !handle) {
      return
    }

    let isCancelled = false

    setError(false)
    setProduct(previewProduct)
    setOptions(getVariantOptionsMap(previewProduct?.variants?.[0]))
    setLoading(!previewProduct)

    fetchProduct()
      .then((fetchedProduct) => {
        if (isCancelled) {
          return
        }

        const mergedProduct = mergeQuickViewProductData(
          previewProduct,
          fetchedProduct
        )

        setProduct(mergedProduct)
        setOptions(getVariantOptionsMap(mergedProduct.variants?.[0]))
      })
      .catch(() => {
        if (isCancelled) {
          return
        }

        if (!previewProduct) {
          setError(true)
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [open, handle, previewProduct])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuantity(1)
    }
  }, [open])

  // Derived selected variant from options (reuse ProductActions logic)
  const selectedVariant = useMemo(() => {
    if (!product?.variants) return undefined

    return findVariantMatchingOptions(product.variants, options) as MedusaProductVariantWithPreorder | undefined
  }, [product?.variants, options])
  const productSummary = useMemo(
    () => (product ? buildQuickViewSummary(product) : undefined),
    [product]
  )
  const detailChips = useMemo(
    () => (product ? buildQuickViewDetailChips(product, selectedVariant) : []),
    [product, selectedVariant]
  )
  const bundleItems = useMemo(
    () =>
      product
        ? buildQuickViewBundleItems(
            product as unknown as Parameters<typeof buildQuickViewBundleItems>[0]
          )
        : [],
    [product]
  )
  const productBundleState = product as
    | {
        bundle?: unknown
        is_bundle?: boolean
      }
    | null
  const detailPath = getProductPath(
    handle,
    productPreview?.isBundle === true ||
      productBundleState?.is_bundle === true ||
      Boolean(productBundleState?.bundle)
  )
  const detailHref =
    sourceHref && sourceLabel
      ? `${detailPath}?from=${encodeURIComponent(sourceHref)}&fromLabel=${encodeURIComponent(sourceLabel)}`
      : detailPath

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
        title: "Added to cart",
        description: `${quantity} × ${product?.title} has been added to your cart.`,
      })
      onOpenChange(false)
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Unable to add to cart",
        description: "Unable to add this item to your cart. Please try again.",
      })
    } finally {
      setIsAdding(false)
    }
  }

  // Retry fetch handler
  const handleRetry = () => {
    setError(false)
    setLoading(!previewProduct)

    fetchProduct()
      .then((fetchedProduct) => {
        const mergedProduct = mergeQuickViewProductData(
          previewProduct,
          fetchedProduct
        )
        setProduct(mergedProduct)
        setOptions(getVariantOptionsMap(mergedProduct.variants?.[0]))
      })
      .catch(() => {
        if (!previewProduct) {
          setError(true)
        }
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

  const priceDisplay = useMemo(
    () => getVariantPriceDisplay(selectedVariant as Parameters<typeof getVariantPriceDisplay>[0]),
    [selectedVariant]
  )
  const preorderPrice = resolvePreorderPrice(selectedVariant, priceDisplay?.price.currency_code)

  // Get stock status
  const stockStatus = getStockStatus(selectedVariant)
  const isOutOfStock = stockStatus.status === "out-of-stock"
  const preorderVariant = selectedVariant as MedusaProductVariantWithPreorder | undefined
  const isPreorderVariant = isPreorder(preorderVariant?.preorder_variant)
  const maxQuantity = stockStatus.status === "preorder" ? 99 : selectedVariant?.inventory_quantity ?? 99
  const preorderAvailableDate = preorderVariant?.preorder_variant?.available_date
    ? new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(preorderVariant.preorder_variant.available_date))
    : null
  const formatPrice = (amount: number, currency: string) =>
    formatCustomerPrice(amount, currency)

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
                saleInfo={isPreorderVariant ? null : saleInfo}
              />
            </div>

            {/* Content Section - 50% on desktop */}
            <div className="flex flex-1 flex-col p-6 sm:p-8 max-h-[70vh] sm:max-h-[80vh] overflow-y-auto">
              {/* Title with link to product page */}
              <Link
                href={detailHref}
                className="text-xl font-bold leading-tight hover:text-primary transition-colors mb-3"
                onClick={() => onOpenChange(false)}
              >
                {product.title}
              </Link>

              {/* Price Display */}
              <div className="mb-4">
                {isPreorderVariant && preorderPrice ? (
                  <div className="space-y-3">
                    <PriceDisplay
                      price={preorderPrice}
                      label="Pre-order price"
                      size="md"
                    />
                    {priceDisplay && (priceDisplay.originalPrice || priceDisplay.price.amount !== preorderPrice.amount) && (
                      <div className="space-y-1">
                        <span className="block font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                          Regular price
                        </span>
                        <span className="font-mono text-sm text-muted-foreground line-through">
                          {formatPrice(
                            priceDisplay.originalPrice ?? priceDisplay.price.amount,
                            priceDisplay.price.currency_code
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  priceDisplay && <PriceDisplay {...priceDisplay} size="md" />
                )}
              </div>

              {productSummary && (
                <p className="mb-4 text-sm leading-6 text-muted-foreground">
                  {productSummary}
                </p>
              )}

              {detailChips.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-2">
                  {detailChips.map((detail) => (
                    <span
                      key={detail}
                      className="border border-border bg-secondary/20 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide text-foreground/80"
                    >
                      {detail}
                    </span>
                  ))}
                </div>
              )}

              {bundleItems.length > 0 && (
                <div className="mb-5 rounded-sm border bg-secondary/20 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Included products
                    </p>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {bundleItems.length}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {bundleItems.slice(0, 4).map((item) => (
                      <li
                        key={`${item.title}-${item.quantity ?? 1}`}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="line-clamp-1">{item.title}</span>
                        {item.quantity ? (
                          <span className="font-mono text-xs text-muted-foreground">
                            x{item.quantity}
                          </span>
                        ) : null}
                      </li>
                    ))}
                    {bundleItems.length > 4 ? (
                      <li className="text-xs text-muted-foreground">
                        +{bundleItems.length - 4} more included products
                      </li>
                    ) : null}
                  </ul>
                </div>
              )}

              {/* Stock Status Badge */}
              <div className="mb-6">
                <StockStatusBadge variant={selectedVariant} />
                {isPreorderVariant && preorderAvailableDate && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Available on{" "}
                    <span className="font-medium text-primary">{preorderAvailableDate}</span>
                  </p>
                )}
              </div>

              {/* Variant Selectors */}
              {displayableOptions.length > 0 && (
                <div className="space-y-4 mb-6">
                  {displayableOptions.map((option) => (
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
                              type="button"
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
                        {isPreorderVariant ? "Pre-order now" : "Add to Cart"}
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
                  <Link href={detailHref} onClick={() => onOpenChange(false)}>
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
