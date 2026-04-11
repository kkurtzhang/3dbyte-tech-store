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
import type { MedusaProduct, MedusaProductVariant, MedusaProductVariantWithPreorder } from "@/lib/medusa/types"
import { isPreorder } from "@/lib/util/is-preorder"
import { getVariantPriceDisplay, resolvePreorderPrice } from "@/lib/util/preorder-pricing"

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

  const updateOption = (optionId: string, value: string) => {
    const newOptions = { ...options, [optionId]: value }
    setOptions(newOptions)

    // Find matching variant
    const variant = product.variants?.find((v) => {
      // Ensure every option in the variant matches the selected options
      return v.options?.every((opt) => newOptions[opt.option_id!] === opt.value)
    })

    onVariantChange(variant as MedusaProductVariant | undefined)
  }

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return

    setIsAdding(true)
    try {
      await addItem(selectedVariant.id, 1)
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
    const variant = selectedVariant || product.variants?.[0]
    return getVariantPriceDisplay(variant as Parameters<typeof getVariantPriceDisplay>[0])
  }, [selectedVariant, product.variants])

  // Extract handle from pathname or use product.id
  const productHandle = pathname?.split("/").pop() || product.id || ""

  // Check if we should show size guide
  const sizeGuideInfo = shouldShowSizeGuide(product)

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

      {/* Options Selection */}
      <div className="space-y-6">
        {product.options?.map((option) => (
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
          <NotifyMeButton
            productId={product.id}
            productHandle={productHandle}
            productTitle={product.title}
            variantId={selectedVariant?.id}
            variantTitle={selectedVariant?.title || undefined}
          />
        ) : (
          <>
            <Button
                size="lg"
                className="w-full font-mono text-lg h-14 uppercase tracking-widest"
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
            <p className="mt-2 text-center text-xs font-mono text-muted-foreground">
                Secure checkout
            </p>
          </>
        )}
      </div>
    </div>
  )
}
