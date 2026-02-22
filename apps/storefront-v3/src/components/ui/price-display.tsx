import { Flame } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface PriceDisplayProps {
  price: { amount: number; currency_code: string }
  originalPrice?: number
  discountPercentage?: number
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: {
    price: "text-sm",
    original: "text-xs",
    badge: "text-[10px]",
  },
  md: {
    price: "text-xl",
    original: "text-sm",
    badge: "text-xs",
  },
  lg: {
    price: "text-2xl",
    original: "text-base",
    badge: "text-xs",
  },
}

/**
 * Formats a price amount with the given currency code.
 * @param amount - The price amount
 * @param currency - The ISO 4217 currency code
 * @returns Formatted price string (e.g., "$99.99")
 */
export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount)
}

export function PriceDisplay({
  price,
  originalPrice,
  discountPercentage,
  size = "md",
}: PriceDisplayProps) {
  const hasDiscount = discountPercentage && discountPercentage > 0
  const isHotDeal = discountPercentage && discountPercentage >= 30
  const showHotDealBadge = discountPercentage && discountPercentage >= 20

  const sizeStyles = sizeClasses[size]

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {/* Sale Price (with discount) or Regular Price */}
        <span
          className={cn(
            "font-mono font-bold tracking-tight",
            sizeStyles.price,
            hasDiscount ? "text-red-500" : "text-foreground"
          )}
        >
          {formatPrice(price.amount, price.currency_code)}
        </span>

        {/* Hot Deal Badge */}
        {showHotDealBadge && (
          <Badge
            className={cn(
              "flex items-center gap-1 font-mono",
              sizeStyles.badge,
              isHotDeal
                ? "bg-red-500 hover:bg-red-600"
                : "bg-primary hover:bg-primary/90"
            )}
          >
            {isHotDeal && <Flame className="h-3 w-3" />}
            HOT DEAL - {Math.round(discountPercentage)}% OFF
          </Badge>
        )}
      </div>

      {/* Original Price (strikethrough) */}
      {hasDiscount && originalPrice && (
        <span
          className={cn(
            "font-mono text-muted-foreground line-through",
            sizeStyles.original
          )}
        >
          {formatPrice(originalPrice, price.currency_code)}
        </span>
      )}
    </div>
  )
}
