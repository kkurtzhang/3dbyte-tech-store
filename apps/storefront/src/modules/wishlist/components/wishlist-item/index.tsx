import { Trash2, ShoppingBag } from 'lucide-react'
import LocalizedClientLink from '@modules/common/components/localized-client-link'
import { Button } from '@modules/common/components/button'
import { WishlistProduct } from '../templates'

type WishlistItemComponentProps = {
  item: WishlistProduct
  onRemove: (itemId: string) => void
  onMoveToCart: () => void
  countryCode: string
}

export default function WishlistItemComponent({
  item,
  onRemove,
  onMoveToCart,
  countryCode,
}: WishlistItemComponentProps) {
  const product = item.product

  if (!product) {
    return null
  }

  const thumbnail = product.thumbnail
  const title = product.title
  const price = product.variants?.[0]?.calculated_price?.calculated_amount
  const currencyCode = product.variants?.[0]?.calculated_price?.currency_code

  return (
    <div className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg">
      <LocalizedClientLink
        href={`/products/${product.handle}`}
        className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-md overflow-hidden"
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No image
          </div>
        )}
      </LocalizedClientLink>

      <div className="flex-grow min-w-0">
        <LocalizedClientLink
          href={`/products/${product.handle}`}
          className="block font-semibold text-lg hover:underline truncate"
        >
          {title}
        </LocalizedClientLink>

        {price !== undefined && currencyCode && (
          <p className="text-sm text-gray-600 mt-1">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currencyCode,
            }).format(price)}
          </p>
        )}

        {product.variants && product.variants.length > 1 && (
          <p className="text-xs text-gray-500 mt-1">
            {product.variants.length} variants available
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <LocalizedClientLink href={`/products/${product.handle}`}>
          <Button
            variant="secondary"
            className="flex items-center gap-2"
            onClick={onMoveToCart}
          >
            <ShoppingBag className="w-4 h-4" />
            View Product
          </Button>
        </LocalizedClientLink>

        <Button
          variant="ghost"
          size="icon"
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => onRemove(item.id)}
          aria-label="Remove from wishlist"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
