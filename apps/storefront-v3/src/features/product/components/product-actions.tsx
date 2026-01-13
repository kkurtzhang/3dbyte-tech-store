"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { StoreProduct, StoreProductOption, StoreProductVariant } from "@medusajs/types"

interface ProductActionsProps {
  product: StoreProduct
  selectedVariant: StoreProductVariant | undefined
  onVariantChange: (variant: StoreProductVariant | undefined) => void
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
  const updateOption = (optionId: string, value: string) => {
    const newOptions = { ...options, [optionId]: value }
    setOptions(newOptions)

    // Find matching variant
    const variant = product.variants?.find((v) => {
      // Ensure every option in the variant matches the selected options
      return v.options?.every((opt) => newOptions[opt.option_id!] === opt.value)
    })

    onVariantChange(variant)
  }

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  // Get price from selected variant or first variant or product
  const displayPrice = useMemo(() => {
    const variant = selectedVariant || product.variants?.[0]
    // @ts-expect-error - Medusa types are strict but the fields query includes prices
    return variant?.calculated_price || variant?.prices?.[0]
  }, [selectedVariant, product.variants])

  return (
    <div className="flex flex-col gap-8">
      {/* Price Display */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{product.title}</h1>
        {displayPrice ? (
             <div className="text-2xl font-mono text-primary">
             {formatPrice(displayPrice.calculated_amount || displayPrice.amount, displayPrice.currency_code)}
           </div>
        ) : (
            <div className="text-2xl font-mono text-muted-foreground">Price on request</div>
        )}
        {product.description && (
             <p className="mt-4 text-muted-foreground leading-relaxed">{product.description}</p>
        )}
      </div>

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
      </div>

      {/* Add to Cart */}
      <div className="pt-6 border-t">
        <Button
            size="lg"
            className="w-full font-mono text-lg h-14 uppercase tracking-widest"
            disabled={!selectedVariant || disabled}
        >
          {selectedVariant ? "Add_to_System" : "Select_Options"}
        </Button>
         <p className="mt-2 text-center text-xs font-mono text-muted-foreground">
            SECURE_TRANSACTION_PROTOCOL_V3
          </p>
      </div>
    </div>
  )
}
