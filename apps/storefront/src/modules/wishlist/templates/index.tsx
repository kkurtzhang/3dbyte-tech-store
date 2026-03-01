'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { getProductsById } from '@lib/data/products'
import { getWishlist, removeFromWishlist, type WishlistItem } from '@lib/data/wishlist'
import { useWishlistStore } from '@lib/store/useWishlistStore'
import { HttpTypes } from '@medusajs/types'
import LocalizedClientLink from '@modules/common/components/localized-client-link'
import { toast } from '@modules/common/components/toast'
import WishlistItemComponent from '@modules/wishlist/components/wishlist-item'

type WishlistTemplateProps = {
  region: HttpTypes.StoreRegion
  countryCode: string
}

type WishlistProduct = WishlistItem & {
  product?: HttpTypes.StoreProduct
}

export default function WishlistTemplate({
  region,
  countryCode,
}: WishlistTemplateProps) {
  const [wishlistWithProducts, setWishlistWithProducts] = useState<WishlistProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const removeFromWishlistStore = useWishlistStore((state) => state.removeFromWishlist)

  useEffect(() => {
    loadWishlist()
  }, [])

  const loadWishlist = async () => {
    setIsLoading(true)
    try {
      const wishlist = await getWishlist()

      // Fetch product details for each wishlist item
      const productIds = wishlist.map(item => item.product_id)
      const productsResponse = await getProductsById({
        ids: productIds,
        countryCode,
      })

      const productsMap = new Map(
        productsResponse.response.products.map(p => [p.id, p])
      )

      const wishlistWithDetails = wishlist.map(item => ({
        ...item,
        product: productsMap.get(item.product_id),
      }))

      setWishlistWithProducts(wishlistWithDetails)
    } catch (error) {
      console.error('Failed to load wishlist:', error)
      toast('error', 'Failed to load wishlist')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = async (itemId: string) => {
    try {
      await removeFromWishlist(itemId)
      removeFromWishlistStore(itemId)
      setWishlistWithProducts(prev => prev.filter(item => item.id !== itemId))
      toast('success', 'Removed from wishlist')
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Failed to remove item')
    }
  }

  const handleMoveToCart = () => {
    toast('info', 'Please go to the product page to add to cart')
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto py-12 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">My Wishlist</h1>

      {wishlistWithProducts.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-4">Your wishlist is empty</h2>
          <p className="text-gray-600 mb-8">
            Start adding products you love to your wishlist!
          </p>
          <LocalizedClientLink
            href="/"
            className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Continue Shopping
          </LocalizedClientLink>
        </div>
      ) : (
        <div className="space-y-4">
          {wishlistWithProducts.map((item) => (
            <WishlistItemComponent
              key={item.id}
              item={item}
              onRemove={handleRemove}
              onMoveToCart={handleMoveToCart}
              countryCode={countryCode}
            />
          ))}
        </div>
      )}
    </div>
  )
}
