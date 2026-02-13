"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { StoreCartLineItem } from "@medusajs/types"
import { Minus, Plus, Trash2, Bookmark } from "lucide-react"
import { useCart } from "@/context/cart-context"
import { useSavedItems } from "@/context/saved-items-context"

interface CartItemProps {
  item: StoreCartLineItem
  currencyCode: string
  showSaveForLater?: boolean
}

export function CartItem({ item, currencyCode, showSaveForLater = true }: CartItemProps) {
  const { updateItem, removeItem } = useCart()
  const { saveItem, isSaved } = useSavedItems()
  const [isUpdating, setIsUpdating] = useState(false)
  const itemIsSaved = isSaved(item.id)

  const handleUpdateQuantity = async (newQuantity: number) => {
    if (newQuantity < 1) return
    setIsUpdating(true)
    try {
      await updateItem(item.id, newQuantity)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRemove = async () => {
    setIsUpdating(true)
    try {
      await removeItem(item.id)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSaveForLater = () => {
    saveItem(item)
  }

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const price = useMemo(() => {
    return {
      amount: item.unit_price,
      currency_code: currencyCode,
    }
  }, [item, currencyCode])

  return (
    <div className="flex gap-4 py-4">
      <div className="relative aspect-square h-20 w-20 min-w-[5rem] overflow-hidden rounded-sm border bg-secondary/20">
        {item.variant?.product?.thumbnail ? (
          <Image
            src={item.variant.product.thumbnail}
            alt={item.title}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-xs text-muted-foreground">
            NO_IMG
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between">
        <div className="grid gap-1">
          <h4 className="line-clamp-2 text-sm font-medium leading-tight">
            {item.title}
          </h4>
          <p className="text-xs text-muted-foreground">
            {item.variant?.title !== "Default Variant" ? item.variant?.title : "Standard"}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="flex items-center rounded-sm border">
                <button
                  onClick={() => handleUpdateQuantity(item.quantity - 1)}
                  disabled={item.quantity <= 1 || isUpdating}
                  className="p-1 hover:bg-secondary disabled:opacity-50"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-8 text-center font-mono text-xs">
                  {isUpdating ? "..." : item.quantity}
                </span>
                <button
                  onClick={() => handleUpdateQuantity(item.quantity + 1)}
                  disabled={isUpdating}
                  className="p-1 hover:bg-secondary disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                </button>
             </div>

             <button
                onClick={handleRemove}
                disabled={isUpdating}
                className="text-muted-foreground hover:text-destructive transition-colors"
            >
                <Trash2 className="h-4 w-4" />
             </button>

             {showSaveForLater && (
               <button
                 onClick={handleSaveForLater}
                 disabled={itemIsSaved}
                 title={itemIsSaved ? "Already saved" : "Save for later"}
                 className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
               >
                 <Bookmark className={`h-4 w-4 ${itemIsSaved ? "fill-current" : ""}`} />
               </button>
             )}
          </div>

          <div className="font-mono text-sm font-medium">
             {formatPrice(price.amount * item.quantity, price.currency_code)}
          </div>
        </div>
      </div>
    </div>
  )
}
