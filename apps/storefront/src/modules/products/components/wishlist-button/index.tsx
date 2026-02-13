'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useWishlistStore } from '@lib/store/useWishlistStore'
import { addToWishlist, removeFromWishlist } from '@lib/data/wishlist'
import { HttpTypes } from '@medusajs/types'
import { toast } from '@modules/common/components/toast'

type WishlistButtonProps = {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  disabled?: boolean
}

export default function WishlistButton({
  product,
  variant,
  disabled,
}: WishlistButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const isInWishlist = useWishlistStore((state) =>
    state.isInWishlist(product.id)
  )
  const addToWishlistStore = useWishlistStore((state) => state.addToWishlist)
  const removeFromWishlistStore = useWishlistStore(
    (state) => state.removeFromWishlist
  )

  const handleToggleWishlist = async () => {
    setIsLoading(true)

    try {
      if (isInWishlist) {
        // Find the item to remove
        const { wishlistItems } = useWishlistStore.getState()
        const item = wishlistItems.find((i) => i.product_id === product.id)

        if (item) {
          await removeFromWishlist(item.id)
          removeFromWishlistStore(item.id)
          toast('success', 'Removed from wishlist')
        }
      } else {
        const result = await addToWishlist(product.id, variant?.id)
        addToWishlistStore(result)
        toast('success', 'Added to wishlist')
      }
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggleWishlist}
      disabled={disabled || isLoading}
      className={`
        flex items-center justify-center w-12 h-12 rounded-lg border
        transition-colors duration-200
        ${isInWishlist
          ? 'border-red-500 text-red-500 bg-red-50'
          : 'border-gray-300 text-gray-600 hover:border-gray-400'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart
        className={`
          w-5 h-5
          ${isInWishlist ? 'fill-current' : ''}
        `}
      />
    </button>
  )
}
