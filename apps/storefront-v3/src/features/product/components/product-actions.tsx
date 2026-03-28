"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useCart } from "@/context/cart-context"
import { useToast } from "@/lib/hooks/use-toast"
import { NotifyMeButton } from "./notify-me-button"
import { ProductWishlistButton } from "./product-wishlist-button"
import { ProductShippingEstimate } from "./product-shipping-estimate"
import { SizeGuideButton, shouldShowSizeGuide } from "@/components/ui/size-guide"
import { PaymentMethodSupport } from "@/components/ui/payment-method-support"
import { usePathname } from "next/navigation"
import { SocialShare } from "./social-share"
import { StockStatusBadge, getStockStatus } from "@/components/ui/stock-status-badge"
import { PriceDisplay } from "@/components/ui/price-display"
import type { MedusaProduct, MedusaProductVariant } from "@/lib/medusa/types"
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
}

export function ProductActions({
  product,
  selectedVariant,
  onVariantChange,
  options,
  setOptions,
  disabled,
}: ProductActionsProps) {
  const { addItem } = useCart()
  const { toast } = useToast()
  const [isAdding, setIsAdding] = useState(false)
  const pathname = usePathname()
  const displayableOptions = useMemo(
    () => getDisplayableProductOptions(product.options),
    [product.options]
  )
  const resolvedVariant = selectedVariant || product.variants?.[0]

  const updateOption = (optionId: string, value: string) => {
    const newOptions = { ...options, [optionId]: value }
    setOptions(newOptions)
    const variant = findVariantMatchingOptions(product.variants, newOptions)
    onVariantChange(variant)
  }

  const handleAddToCart = async () => {
    if (!resolvedVariant?.id) return

    setIsAdding(true)
    try {
      await addItem(resolvedVariant.id, 1)
      toast({
        title: "Item_Acquired",
        description: `${product.title} has been added to your system inventory.`,
      })
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

  // Calculate price and sale info for PriceDisplay
  const priceInfo = useMemo(() => {
    const variant = resolvedVariant
    const variantData = variant as Record<string, unknown> | undefined
    const calcPrice = variantData?.calculated_price as Record<string, unknown> | undefined
    const calculatedAmount = calcPrice?.calculated_amount as number | undefined
    const originalAmount = calcPrice?.original_amount as number | undefined
    const prices = variantData?.prices as Array<{ amount: number; currency_code: string }> | undefined

    // Use calculated price or fall back to regular price
    // Note: Medusa v2 returns prices in dollars, not cents
    const priceAmount = calculatedAmount || originalAmount || prices?.[0]?.amount || 0
    const currencyCode = prices?.[0]?.currency_code || "usd"

    // Calculate discount
    const hasDiscount = originalAmount && calculatedAmount && originalAmount > calculatedAmount
    const discountPercentage = hasDiscount
      ? Math.round((1 - calculatedAmount / originalAmount) * 100)
      : undefined

    return {
      price: { amount: priceAmount, currency_code: currencyCode },
      originalPrice: hasDiscount ? originalAmount : undefined,
      discountPercentage,
    }
  }, [resolvedVariant, product.variants])

  // Extract handle from pathname or use product.id
  const productHandle = pathname?.split("/").pop() || product.id || ""
  const wishlistItem = {
    id: product.id,
    handle: product.handle || productHandle,
    title: product.title,
    thumbnail: product.thumbnail || "",
    price: {
      amount: priceInfo.price.amount,
      currency_code: priceInfo.price.currency_code.toUpperCase(),
    },
    variantId: resolvedVariant?.id,
  }

  // Check if we should show size guide
  const sizeGuideInfo = shouldShowSizeGuide(product)

  // Get stock status for out-of-stock check
  const stockStatus = getStockStatus(resolvedVariant)
  const isOutOfStock = stockStatus.status === "out-of-stock"

  return (
    <div className="flex flex-col gap-8">
      {/* Price Display */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{product.title}</h1>
        {resolvedVariant?.sku && (
          <p className="mb-3 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
            SKU {resolvedVariant.sku}
          </p>
        )}
        <div className="flex items-start gap-3 flex-wrap">
          <PriceDisplay
            price={priceInfo.price}
            originalPrice={priceInfo.originalPrice}
            discountPercentage={priceInfo.discountPercentage}
            size="lg"
          />
          <StockStatusBadge variant={resolvedVariant} />
        </div>
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

      {/* Options Selection */}
      <div className="space-y-6">
        {displayableOptions.map((option) => (
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
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <NotifyMeButton
              productId={product.id}
              productHandle={productHandle}
              productTitle={product.title}
              variantId={resolvedVariant?.id}
              variantTitle={resolvedVariant?.title || undefined}
            />

            <ProductWishlistButton item={wishlistItem} />
          </div>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <Button
                size="lg"
                className="w-full font-mono text-lg h-14 uppercase tracking-widest"
                disabled={!resolvedVariant || disabled || isAdding}
                onClick={handleAddToCart}
            >
              {isAdding ? "Adding..." : resolvedVariant ? "Add to Cart" : "Select Options"}
            </Button>

            <ProductWishlistButton item={wishlistItem} />
          </div>
        )}

        <PaymentMethodSupport
          compact
          label="Secure checkout with Stripe"
          className="mt-4"
        />
      </div>

      <ProductShippingEstimate variantId={resolvedVariant?.id} />
    </div>
  )
}
