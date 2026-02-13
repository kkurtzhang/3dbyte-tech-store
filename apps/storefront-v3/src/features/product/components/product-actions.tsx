"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { StoreProduct, StoreProductOption, StoreProductVariant } from "@medusajs/types"
import { useCart } from "@/context/cart-context"
import { useToast } from "@/lib/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertTriangle, XCircle, Package } from "lucide-react"

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
  const { addItem } = useCart()
  const { toast } = useToast()
  const [isAdding, setIsAdding] = useState(false)

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

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  // Stock status logic
  const getStockStatus = () => {
    if (!selectedVariant) return { status: "unknown", quantity: null }

    const quantity = selectedVariant.inventory_quantity ?? 0
    const manageInventory = selectedVariant.manage_inventory ?? true

    if (!manageInventory) {
      return { status: "in-stock", quantity: null }
    }

    if (quantity === 0) {
      return { status: "out-of-stock", quantity: 0 }
    } else if (quantity <= 10) {
      return { status: "low-stock", quantity }
    } else {
      return { status: "in-stock", quantity }
    }
  }

  const stockStatus = getStockStatus()

  const StockStatusBadge = () => {
    if (stockStatus.status === "unknown") {
      return null
    }

    if (stockStatus.status === "out-of-stock") {
      return (
        <Badge variant="destructive" className="gap-1.5 px-3 py-1.5 text-sm font-medium">
          <XCircle className="h-4 w-4" />
          Out of Stock
        </Badge>
      )
    }

    if (stockStatus.status === "low-stock") {
      return (
        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700">
          <AlertTriangle className="h-4 w-4" />
          Low Stock
          {stockStatus.quantity !== null && (
            <span className="text-xs opacity-75">
              ({stockStatus.quantity} left)
            </span>
          )}
        </Badge>
      )
    }

    // In Stock
    return (
      <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700">
        <CheckCircle2 className="h-4 w-4" />
        In Stock
        {stockStatus.quantity !== null && stockStatus.quantity > 10 && (
          <span className="text-xs opacity-75">
            ({stockStatus.quantity} available)
          </span>
        )}
      </Badge>
    )
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
        <div className="flex items-center gap-3 flex-wrap">
          {displayPrice ? (
               <div className="text-2xl font-mono text-primary">
               {formatPrice(displayPrice.calculated_amount || displayPrice.amount, displayPrice.currency_code)}
             </div>
          ) : (
              <div className="text-2xl font-mono text-muted-foreground">Price on request</div>
          )}
          <StockStatusBadge />
        </div>
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
            disabled={!selectedVariant || disabled || isAdding}
            onClick={handleAddToCart}
        >
          {isAdding ? "Adding..." : selectedVariant ? "Add to Cart" : "Select Options"}
        </Button>
         <p className="mt-2 text-center text-xs font-mono text-muted-foreground">
            Secure checkout
          </p>
      </div>
    </div>
  )
}
