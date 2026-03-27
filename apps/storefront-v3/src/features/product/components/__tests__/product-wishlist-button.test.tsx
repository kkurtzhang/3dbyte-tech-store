import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProductWishlistButton } from "../product-wishlist-button"

const addToWishlist = jest.fn()
const removeFromWishlist = jest.fn()
const isInWishlist = jest.fn()
const toast = jest.fn()

jest.mock("@/context/wishlist-context", () => ({
  useWishlist: () => ({
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
  }),
}))

jest.mock("@/lib/hooks/use-toast", () => ({
  useToast: () => ({
    toast,
  }),
}))

jest.mock("lucide-react", () => ({
  Heart: () => <span data-testid="heart-icon" />,
}))

const wishlistItem = {
  id: "prod_123",
  handle: "test-product",
  title: "Test Product",
  thumbnail: "/test-product.jpg",
  price: {
    amount: 29.99,
    currency_code: "AUD",
  },
  variantId: "variant_123",
}

describe("ProductWishlistButton", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("adds the product to wishlist when not already saved", async () => {
    const user = userEvent.setup()
    isInWishlist.mockReturnValue(false)

    render(<ProductWishlistButton item={wishlistItem} />)

    await user.click(screen.getByRole("button", { name: /save to wishlist/i }))

    expect(addToWishlist).toHaveBeenCalledWith(wishlistItem)
    expect(removeFromWishlist).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Saved to wishlist",
      })
    )
  })

  it("removes the product when it is already in wishlist", async () => {
    const user = userEvent.setup()
    isInWishlist.mockReturnValue(true)

    render(<ProductWishlistButton item={wishlistItem} />)

    await user.click(screen.getByRole("button", { name: /remove from wishlist/i }))

    expect(removeFromWishlist).toHaveBeenCalledWith(wishlistItem.id)
    expect(addToWishlist).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Removed from wishlist",
      })
    )
  })
})
