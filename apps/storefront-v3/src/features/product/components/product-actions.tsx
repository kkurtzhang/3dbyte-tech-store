"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useCart } from "@/context/cart-context"
import { useToast } from "@/lib/hooks/use-toast"
import { NotifyMeButton } from "./notify-me-button"
import { SizeGuideButton, shouldShowSizeGuide } from "@/components/ui/size-guide"
import { usePathname } from "next/navigation"
import { SocialShare } from "./social-share"
import { StockStatusBadge, getStockStatus } from "@/components/ui/stock-status-badge"
import { PriceDisplay } from "@/components/ui/price-display"
import type { BundleProduct } from "@/lib/medusa/bundles"
import type { MedusaProduct, MedusaProductVariant, MedusaProductVariantWithPreorder } from "@/lib/medusa/types"
import { isPreorder } from "@/lib/util/is-preorder"
import { getVariantPriceDisplay, resolvePreorderPrice } from "@/lib/util/preorder-pricing"
import { getRenderableOptions } from "@/features/product/lib/bundle-pricing"
import { BundleProductActions } from "./bundle-product-actions"
import { AvailableInBundles } from "./available-in-bundles"
import {
  findVariantMatchingOptions,
  getDisplayableProductOptions,
} from "../lib/product-variants"

interface ProductActionsProps {
  product: MedusaProduct
  selectedVariant: MedusaProductVariant | undefined
  onVariantChange: (variant: MedusaProductVariant | undefined) => void
  options: Record<string, string>
  setOptions: (options: Record<string, string>) => void
  disabled?: boolean
  bundleProduct?: BundleProduct | null
  availableInBundles?: BundleProduct[]
}

export function ProductActions({
  product,
  selectedVariant,
  onVariantChange,
  options,
  setOptions,
  disabled,
  bundleProduct,
  availableInBundles = [],
}: ProductActionsProps) {
  const { addItem } = useCart()
  const { toast } = useToast()
  const [isAdding, setIsAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const pathname = usePathname()
  const displayableOptions = useMemo(
    () => getDisplayableProductOptions(product.options),
    [product.options]
  )

  const updateOption = (optionId: string, value: string) => {
    const newOptions = { ...options, [optionId]: value }
    setOptions(newOptions)

    const variant = findVariantMatchingOptions(product.variants, newOptions)
    onVariantChange(variant)
  }

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return

    setIsAdding(true)
    try {
      await addItem(selectedVariant.id, quantity)
      toast({
        title: "Added to cart",
        description: `${product.title} has been added to your cart.`,
      })
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

  // Calculate price and sale info for PriceDisplay
  const priceInfo = useMemo(() => {
    const variant = selectedVariant || product.variants?.[0]
    return getVariantPriceDisplay(variant as Parameters<typeof getVariantPriceDisplay>[0])
  }, [selectedVariant, product.variants])

  // Extract handle from pathname or use product.id
  const productHandle = pathname?.split("/").pop() || product.id || ""

  // Check if we should show size guide
  const sizeGuideInfo = shouldShowSizeGuide(product)
  const renderableOptions = useMemo(() => getRenderableOptions(product), [product])

  // Get stock status for out-of-stock check
  const stockStatus = getStockStatus(selectedVariant)
  const isOutOfStock = stockStatus.status === "out-of-stock"
  const preorderVariant = selectedVariant as MedusaProductVariantWithPreorder | undefined
  const isPreorderVariant = isPreorder(preorderVariant?.preorder_variant)
  const preorderPrice = resolvePreorderPrice(preorderVariant, priceInfo?.price.currency_code)
  const preorderAvailableDate = preorderVariant?.preorder_variant?.available_date
    ? new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(preorderVariant.preorder_variant.available_date))
    : null
  const formatPrice = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount)

  if (bundleProduct) {
    return <BundleProductActions product={product} bundleProduct={bundleProduct} />
  }

  const quantitySelector = (
    <div className="flex h-14 min-w-[132px] items-stretch overflow-hidden rounded-sm border bg-background">
      <button
        type="button"
        className="flex h-full w-12 items-center justify-center text-sm transition-colors hover:bg-secondary disabled:opacity-50"
        aria-label="Decrease quantity"
        disabled={quantity <= 1 || isAdding}
        onClick={() => setQuantity((current) => Math.max(1, current - 1))}
      >
        -
      </button>
      <span className="flex flex-1 items-center justify-center border-x font-mono text-sm">
        {quantity}
      </span>
      <button
        type="button"
        className="flex h-full w-12 items-center justify-center text-sm transition-colors hover:bg-secondary disabled:opacity-50"
        aria-label="Increase quantity"
        disabled={isAdding}
        onClick={() => setQuantity((current) => current + 1)}
      >
        +
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-8">
      {/* Price Display */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{product.title}</h1>
        <div className="flex items-start gap-3 flex-wrap">
          {isPreorderVariant && preorderPrice ? (
            <div className="space-y-3">
              <PriceDisplay
                price={preorderPrice}
                label="Pre-order price"
                size="lg"
              />
              {priceInfo && (priceInfo.originalPrice || priceInfo.price.amount !== preorderPrice.amount) && (
                <div className="space-y-1">
                  <span className="block font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                    Regular price
                  </span>
                  <span className="font-mono text-sm text-muted-foreground line-through">
                    {formatPrice(
                      priceInfo.originalPrice ?? priceInfo.price.amount,
                      priceInfo.price.currency_code
                    )}
                  </span>
                </div>
              )}
            </div>
          ) : (
            priceInfo && (
              <PriceDisplay
                price={priceInfo.price}
                originalPrice={priceInfo.originalPrice}
                discountPercentage={priceInfo.discountPercentage}
                label={priceInfo.label}
                size="lg"
              />
            )
            )}
          <StockStatusBadge variant={selectedVariant} />
        </div>
        {isPreorderVariant && preorderAvailableDate && (
          <p className="mt-3 text-sm text-muted-foreground">
            Available on <span className="font-medium text-primary">{preorderAvailableDate}</span>
          </p>
        )}
        {product.description && (
             <p className="mt-4 text-muted-foreground leading-relaxed">{product.description}</p>
        )}
      </div>

      {/* Social Share Buttons */}
      <SocialShare
        productTitle={product.title}
        productDescription={product.description || undefined}
        productImage={product.thumbnail || undefined}
      />

      <AvailableInBundles
        bundles={availableInBundles}
        product={product}
        selectedVariant={selectedVariant}
      />

      {/* Options Selection */}
      <div className="space-y-6">
        {renderableOptions.map((option) => (
          <div key={option.id} className="space-y-3">
            <span className="text-sm font-mono font-bold uppercase tracking-wider text-muted-foreground">
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
                    >
                        {value.value}
                    </button>
                 )
              })}
            </div>
          </div>
        ))}

        {/* Size Guide Button - Only show for apparel/products with sizes */}
        {sizeGuideInfo.shouldShow && (
          <div className="pt-2">
            <SizeGuideButton 
              category={sizeGuideInfo.category} 
              productType={sizeGuideInfo.productType}
            />
          </div>
        )}
      </div>

      {/* Add to Cart / Notify Me */}
      <div className="pt-6 border-t">
        {isOutOfStock ? (
          <>
            <Button
              size="lg"
              className="w-full font-mono text-lg h-14 uppercase tracking-widest"
              disabled
            >
              Out of Stock
            </Button>
            <div className="mt-4">
              <NotifyMeButton
                productId={product.id}
                productHandle={productHandle}
                productTitle={product.title}
                variantId={selectedVariant?.id}
                variantTitle={selectedVariant?.title || undefined}
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-stretch gap-3">
              {quantitySelector}
              <Button
                  size="lg"
                  className="flex-1 font-mono text-lg h-14 uppercase tracking-widest"
                  disabled={!selectedVariant || disabled || isAdding}
                  onClick={handleAddToCart}
              >
                {isAdding
                  ? "Adding..."
                  : selectedVariant
                    ? isPreorderVariant
                      ? "Pre-order now"
                      : "Add to Cart"
                    : "Select Options"}
              </Button>
            </div>
            <p className="mt-2 text-center text-xs font-mono text-muted-foreground">
                Secure checkout
            </p>
          </>
        )}
      </div>
    </div>
  )
}
