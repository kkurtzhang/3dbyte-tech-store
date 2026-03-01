import { StoreProductVariant } from "@medusajs/types"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react"

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock" | "unknown"

export interface StockStatusResult {
  status: StockStatus
  quantity: number | null
}

/**
 * Determines the stock status for a product variant.
 *
 * @param variant - The product variant to check stock status for
 * @returns An object containing the status and quantity
 *
 * @example
 * ```tsx
 * const { status, quantity } = getStockStatus(selectedVariant)
 * if (status === "out-of-stock") {
 *   // Show notify me button
 * }
 * ```
 */
export function getStockStatus(variant: StoreProductVariant | undefined): StockStatusResult {
  if (!variant) return { status: "unknown", quantity: null }

  const quantity = variant.inventory_quantity ?? 0
  const manageInventory = variant.manage_inventory ?? true

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

interface StockStatusBadgeProps {
  variant: StoreProductVariant | undefined
}

/**
 * Displays a badge indicating the stock status of a product variant.
 *
 * - In Stock: Green badge with CheckCircle2 icon
 * - Low Stock (<=10): Yellow badge with AlertTriangle icon, shows count
 * - Out of Stock: Red/destructive badge with XCircle icon
 *
 * @param props - Component props
 * @param props.variant - The product variant to display stock status for
 *
 * @example
 * ```tsx
 * <StockStatusBadge variant={selectedVariant} />
 * ```
 */
export function StockStatusBadge({ variant }: StockStatusBadgeProps) {
  const stockStatus = getStockStatus(variant)

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
      <Badge
        variant="secondary"
        className="gap-1.5 px-3 py-1.5 text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700"
      >
        <AlertTriangle className="h-4 w-4" />
        Low Stock
        {stockStatus.quantity !== null && (
          <span className="text-xs opacity-75">({stockStatus.quantity} left)</span>
        )}
      </Badge>
    )
  }

  // In Stock
  return (
    <Badge
      variant="secondary"
      className="gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700"
    >
      <CheckCircle2 className="h-4 w-4" />
      In Stock
      {stockStatus.quantity !== null && stockStatus.quantity > 10 && (
        <span className="text-xs opacity-75">({stockStatus.quantity} available)</span>
      )}
    </Badge>
  )
}
