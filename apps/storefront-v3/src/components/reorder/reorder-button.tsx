"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { reorderAction } from "@/app/actions/reorder"
import { Loader2, RefreshCw, AlertTriangle, Check, ShoppingCart } from "lucide-react"
import { useToast } from "@/lib/hooks/use-toast"

interface ReorderButtonProps {
  orderId: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  showText?: boolean
}

export function ReorderButton({ orderId, variant = "outline", size = "sm", showText = true }: ReorderButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [lastResult, setLastResult] = useState<{
    added: string[]
    outOfStock: { productTitle: string; quantity: number }[]
  } | null>(null)
  const { toast } = useToast()

  const handleReorder = () => {
    startTransition(async () => {
      const result = await reorderAction(orderId)
      setLastResult({
        added: result.addedItems,
        outOfStock: result.outOfStockItems,
      })

      if (result.success) {
        if (result.outOfStockItems.length > 0) {
          toast({
            title: `Added ${result.addedItems.length} item(s) to cart`,
            description: `Out of stock: ${result.outOfStockItems.map(i => i.productTitle).join(", ")}`,
            variant: "default",
          })
        } else {
          toast({
            title: `Added ${result.addedItems.length} item(s) to cart`,
          })
        }
      } else if (result.outOfStockItems.length > 0) {
        // Partial success
        if (result.addedItems.length > 0) {
          toast({
            title: `Added ${result.addedItems.length} item(s)`,
            description: `Out of stock: ${result.outOfStockItems.map(i => i.productTitle).join(", ")}`,
            variant: "default",
          })
        } else {
          toast({
            title: "All items are out of stock",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: result.errors[0] || "Failed to reorder",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleReorder}
        disabled={isPending}
        className="font-mono uppercase tracking-wider"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : showText ? (
          <RefreshCw className="h-4 w-4 mr-2" />
        ) : null}
        {showText ? "Reorder" : <RefreshCw className="h-4 w-4" />}
      </Button>

      {/* Out of stock indicator if previously shown */}
      {lastResult && lastResult.outOfStock.length > 0 && (
        <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {lastResult.outOfStock.length} item(s) out of stock
        </div>
      )}
    </>
  )
}

/**
 * ReorderModal - A modal that shows reorder results and allows viewing details
 */
interface ReorderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: {
    added: string[]
    outOfStock: { productTitle: string; quantity: number; variantTitle: string }[]
  } | null
}

export function ReorderModal({ open, onOpenChange, result }: ReorderModalProps) {
  if (!result) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={() => onOpenChange(false)}
      />
      
      {/* Modal content */}
      <div className="relative bg-background rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          {result.added.length > 0 ? (
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600" />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
          )}
          <div>
            <h3 className="font-mono font-semibold uppercase tracking-wider">
              {result.added.length > 0 ? "Items Added to Cart" : "Unable to Reorder"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {result.added.length > 0 
                ? `${result.added.length} item(s) ready for checkout` 
                : "All items are unavailable"}
            </p>
          </div>
        </div>

        {/* Added items */}
        {result.added.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Added to Cart
            </h4>
            <ul className="space-y-1">
              {result.added.map((item, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Out of stock items */}
        {result.outOfStock.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Out of Stock
            </h4>
            <ul className="space-y-1">
              {result.outOfStock.map((item, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {item.productTitle}
                    {item.variantTitle && item.variantTitle !== "Default" && (
                      <span className="text-xs">({item.variantTitle})</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button 
            className="flex-1 font-mono uppercase tracking-wider"
            onClick={() => {
              onOpenChange(false)
              window.location.href = "/cart"
            }}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            View Cart
          </Button>
        </div>
      </div>
    </div>
  )
}
