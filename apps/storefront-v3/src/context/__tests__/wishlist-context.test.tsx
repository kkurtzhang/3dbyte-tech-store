import type { ReactNode } from "react"
import { act, render, renderHook, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  addWishlistItemAction,
  clearWishlistAction,
  getWishlistAction,
  removeWishlistItemAction,
} from "@/app/actions/wishlist"
import type { WishlistItem } from "@/lib/wishlist/types"
import { useCart } from "../cart-context"
import { WishlistProvider, useWishlist } from "../wishlist-context"

jest.mock("@/app/actions/wishlist", () => ({
  getWishlistAction: jest.fn(),
  addWishlistItemAction: jest.fn(),
  removeWishlistItemAction: jest.fn(),
  clearWishlistAction: jest.fn(),
}))

jest.mock("../cart-context", () => ({
  useCart: jest.fn(),
}))

const mockGetWishlistAction = getWishlistAction as jest.MockedFunction<
  typeof getWishlistAction
>
const mockAddWishlistItemAction = addWishlistItemAction as jest.MockedFunction<
  typeof addWishlistItemAction
>
const mockRemoveWishlistItemAction =
  removeWishlistItemAction as jest.MockedFunction<typeof removeWishlistItemAction>
const mockClearWishlistAction = clearWishlistAction as jest.MockedFunction<
  typeof clearWishlistAction
>

const createMockItem = (
  id: string,
  wishlistId = `wish_${id}`,
  variantId = `variant_${id}`
): WishlistItem => ({
  id,
  wishlistId,
  handle: `product-${id}`,
  title: `Product ${id}`,
  thumbnail: `/thumbnail-${id}.jpg`,
  price: {
    amount: 1000,
    currency_code: "AUD",
  },
  variantId,
})

const wrapper = ({ children }: { children: ReactNode }) => (
  <WishlistProvider>{children}</WishlistProvider>
)

const TestComponent = () => {
  const {
    wishlist,
    isLoading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    clearWishlist,
    moveToCart,
  } = useWishlist()

  return (
    <div>
      <span data-testid="loading">{isLoading ? "Loading" : "Not Loading"}</span>
      <span data-testid="count">{wishlist.length}</span>
      <span data-testid="ids">{wishlist.map((i) => i.id).join(",")}</span>
      <span data-testid="in-list">
        {isInWishlist("item_1") ? "Yes" : "No"}
      </span>
      <button
        onClick={() => void addToWishlist(createMockItem("item_2"))}
        data-testid="add"
      >
        Add
      </button>
      <button
        onClick={() => void removeFromWishlist("item_1")}
        data-testid="remove"
      >
        Remove
      </button>
      <button onClick={() => void clearWishlist()} data-testid="clear">
        Clear
      </button>
      <button
        onClick={() => void moveToCart(createMockItem("item_1"))}
        data-testid="move-to-cart"
      >
        Move to Cart
      </button>
    </div>
  )
}

describe("WishlistProvider", () => {
  const mockAddToCart = jest.fn()
  const serverItem = createMockItem("item_1")

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useCart as jest.Mock).mockReturnValue({
      addItem: mockAddToCart,
    })
    mockGetWishlistAction.mockResolvedValue({
      success: true,
      wishlist: [serverItem],
    })
    mockAddWishlistItemAction.mockResolvedValue({
      success: true,
      item: createMockItem("item_2"),
    })
    mockRemoveWishlistItemAction.mockResolvedValue({ success: true })
    mockClearWishlistAction.mockResolvedValue({ success: true })
  })

  it("starts in loading state", () => {
    mockGetWishlistAction.mockReturnValue(new Promise(() => {}))

    render(
      <WishlistProvider>
        <TestComponent />
      </WishlistProvider>
    )

    expect(screen.getByTestId("loading")).toHaveTextContent("Loading")
  })

  it("loads wishlist items from the server", async () => {
    render(
      <WishlistProvider>
        <TestComponent />
      </WishlistProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading")
      expect(screen.getByTestId("count")).toHaveTextContent("1")
      expect(screen.getByTestId("ids")).toHaveTextContent("item_1")
    })
  })

  it("throws when useWishlist is called outside WishlistProvider", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation()

    expect(() => renderHook(() => useWishlist())).toThrow(
      "useWishlist must be used within a WishlistProvider"
    )

    consoleSpy.mockRestore()
  })

  it("adds an item with the server action result", async () => {
    const user = userEvent.setup()

    render(
      <WishlistProvider>
        <TestComponent />
      </WishlistProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading")
    })

    await user.click(screen.getByTestId("add"))

    await waitFor(() => {
      expect(mockAddWishlistItemAction).toHaveBeenCalledWith(createMockItem("item_2"))
      expect(screen.getByTestId("count")).toHaveTextContent("2")
      expect(screen.getByTestId("ids")).toHaveTextContent("item_1,item_2")
    })
  })

  it("does not create a duplicate when the item is already loaded", async () => {
    const { result } = renderHook(() => useWishlist(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.addToWishlist(createMockItem("item_1"))
    })

    expect(mockAddWishlistItemAction).not.toHaveBeenCalled()
    expect(result.current.wishlist).toHaveLength(1)
  })

  it("removes an item by its server wishlist id", async () => {
    const user = userEvent.setup()

    render(
      <WishlistProvider>
        <TestComponent />
      </WishlistProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("1")
    })

    await user.click(screen.getByTestId("remove"))

    await waitFor(() => {
      expect(mockRemoveWishlistItemAction).toHaveBeenCalledWith(serverItem.wishlistId)
      expect(screen.getByTestId("count")).toHaveTextContent("0")
      expect(screen.getByTestId("in-list")).toHaveTextContent("No")
    })
  })

  it("clears the server wishlist ids", async () => {
    const user = userEvent.setup()

    render(
      <WishlistProvider>
        <TestComponent />
      </WishlistProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("1")
    })

    await user.click(screen.getByTestId("clear"))

    await waitFor(() => {
      expect(mockClearWishlistAction).toHaveBeenCalledWith([serverItem.wishlistId])
      expect(screen.getByTestId("count")).toHaveTextContent("0")
    })
  })

  it("moves a wishlist item to the cart", async () => {
    const user = userEvent.setup()

    render(
      <WishlistProvider>
        <TestComponent />
      </WishlistProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("1")
    })

    await user.click(screen.getByTestId("move-to-cart"))

    await waitFor(() => {
      expect(mockAddToCart).toHaveBeenCalledWith(serverItem.variantId, 1)
      expect(mockRemoveWishlistItemAction).toHaveBeenCalledWith(serverItem.wishlistId)
    })
  })
})
