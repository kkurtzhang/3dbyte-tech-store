import type { MedusaProductVariant, MedusaProductVariantWithPreorder } from "@/lib/medusa/types"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import { isPreorder } from "@/lib/util/is-preorder"

const LOW_STOCK_THRESHOLD = 5

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock" | "preorder" | "unknown"

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
export function getStockStatus(variant: MedusaProductVariant | undefined): StockStatusResult {
  if (!variant) return { status: "unknown", quantity: null }

  const quantity = variant.inventory_quantity ?? 0
  const manageInventory = variant.manage_inventory ?? true
  const preorderVariant = variant as MedusaProductVariantWithPreorder | undefined
  const preorder = isPreorder(preorderVariant?.preorder_variant)

  if (preorder) {
    return { status: "preorder", quantity }
  }

  if (!manageInventory) {
    return { status: "in-stock", quantity: null }
  }

  if (quantity === 0) {
    return { status: "out-of-stock", quantity: 0 }
  } else if (quantity < LOW_STOCK_THRESHOLD) {
    return { status: "low-stock", quantity }
  } else {
    return { status: "in-stock", quantity }
  }
}

interface StockStatusBadgeProps {
  variant: MedusaProductVariant | undefined
}

/**
 * Displays a badge indicating the stock status of a product variant.
 *
 * - In Stock: Green badge with CheckCircle2 icon
 * - Low Stock (<5): Yellow badge with AlertTriangle icon
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
        className="gap-1.5 border-yellow-300 bg-yellow-100 px-3 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
      >
        <AlertTriangle className="h-4 w-4" />
        Low Stock
      </Badge>
    )
  }

  if (stockStatus.status === "preorder") {
    return (
      <Badge
        variant="secondary"
        className="gap-1.5 border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
      >
        <AlertTriangle className="h-4 w-4" />
        Pre-order
      </Badge>
    )
  }

  // In Stock
  return (
    <Badge
      variant="secondary"
      className="gap-1.5 border-green-300 bg-green-100 px-3 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/30"
    >
      <CheckCircle2 className="h-4 w-4" />
      In Stock
    </Badge>
  )
}
