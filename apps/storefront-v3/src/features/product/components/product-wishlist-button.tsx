"use client"

import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWishlist, type WishlistItem } from "@/context/wishlist-context"
import { useToast } from "@/lib/hooks/use-toast"
import { cn } from "@/lib/utils"

interface ProductWishlistButtonProps {
  item: WishlistItem
  className?: string
}

export function ProductWishlistButton({
  item,
  className,
}: ProductWishlistButtonProps) {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist()
  const { toast } = useToast()
  const isSaved = isInWishlist(item.id)

  const handleClick = () => {
    if (isSaved) {
      removeFromWishlist(item.id)
      toast({
        title: "Removed from wishlist",
        description: "This product has been removed from your saved items.",
      })
      return
    }

    addToWishlist(item)
    toast({
      title: "Saved to wishlist",
      description: "This product is ready in your wishlist whenever you come back.",
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={handleClick}
      aria-pressed={isSaved}
      aria-label={isSaved ? "Remove from wishlist" : "Save to wishlist"}
      className={cn(
        "h-14 min-w-14 gap-2 px-4 font-mono uppercase tracking-wider",
        isSaved && "border-primary bg-primary/5 text-primary",
        className
      )}
    >
      <Heart
        className="h-4 w-4"
        fill={isSaved ? "currentColor" : "none"}
      />
      <span className="hidden sm:inline">{isSaved ? "Saved" : "Wishlist"}</span>
    </Button>
  )
}
