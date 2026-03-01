import { render, screen, waitFor, act, renderHook } from "@testing-library/react"
import { WishlistProvider, useWishlist, type WishlistItem } from "../wishlist-context"
import { useCart } from "../cart-context"

// Mock cart-context
jest.mock("../cart-context", () => ({
  useCart: jest.fn(),
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
    get store() {
      return store
    },
  }
})()

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
})

// Helper to create mock wishlist item
const createMockItem = (id: string, variantId?: string): WishlistItem => ({
  id,
  handle: `product-${id}`,
  title: `Product ${id}`,
  thumbnail: `/thumbnail-${id}.jpg`,
  price: {
    amount: 1000,
    currency_code: "aud",
  },
  variantId: variantId || `variant_${id}`,
})

// Test component
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
      <button
        onClick={() => addToWishlist(createMockItem("item_1"))}
        data-testid="add"
      >
        Add
      </button>
      <button
        onClick={() => removeFromWishlist("item_1")}
        data-testid="remove"
      >
        Remove
      </button>
      <button onClick={() => clearWishlist()} data-testid="clear">
        Clear
      </button>
      <button
        onClick={() => moveToCart(createMockItem("item_1", "variant_1"))}
        data-testid="move-to-cart"
      >
        Move to Cart
      </button>
      <span data-testid="in-list">
        {isInWishlist("item_1") ? "Yes" : "No"}
      </span>
    </div>
  )
}

describe("WishlistProvider", () => {
  const mockAddToCart = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
    ;(useCart as jest.Mock).mockReturnValue({
      addItem: mockAddToCart,
    })
  })

  describe("initialization", () => {
    it("starts in loading state", () => {
      render(
        <WishlistProvider>
          <TestComponent />
        </WishlistProvider>
      )

      expect(screen.getByTestId("loading")).toHaveTextContent("Loading")
    })

    it("sets loading to false after initialization", async () => {
      render(
        <WishlistProvider>
          <TestComponent />
        </WishlistProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading")
      })
    })

    it("loads items from localStorage", async () => {
      localStorageMock.store["3dbyte-wishlist"] = JSON.stringify([
        createMockItem("stored_1"),
      ])

      render(
        <WishlistProvider>
          <TestComponent />
        </WishlistProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1")
        expect(screen.getByTestId("ids")).toHaveTextContent("stored_1")
      })
    })
  })

  describe("useWishlist hook", () => {
    it("throws error when used outside WishlistProvider", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()

      expect(() => {
        renderHook(() => useWishlist())
      }).toThrow("useWishlist must be used within a WishlistProvider")

      consoleSpy.mockRestore()
    })

    it("provides wishlist context values", async () => {
      const { result } = renderHook(() => useWishlist(), {
        wrapper: WishlistProvider,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current).toHaveProperty("wishlist")
      expect(result.current).toHaveProperty("addToWishlist")
      expect(result.current).toHaveProperty("removeFromWishlist")
      expect(result.current).toHaveProperty("isInWishlist")
      expect(result.current).toHaveProperty("clearWishlist")
      expect(result.current).toHaveProperty("moveToCart")
    })
  })

  describe("addToWishlist", () => {
    it("adds item to wishlist", async () => {
      render(
        <WishlistProvider>
          <TestComponent />
        </WishlistProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading")
      })

      await act(async () => {
        screen.getByTestId("add").click()
      })

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1")
        expect(screen.getByTestId("ids")).toHaveTextContent("item_1")
      })
    })

    it("does not add duplicate items", async () => {
      render(
        <WishlistProvider>
          <TestComponent />
        </WishlistProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading")
      })

      // Add same item twice
      await act(async () => {
        screen.getByTestId("add").click()
      })
      await act(async () => {
        screen.getByTestId("add").click()
      })

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1")
      })
    })
  })

  describe("removeFromWishlist", () => {
    it("removes item from wishlist", async () => {
      localStorageMock.store["3dbyte-wishlist"] = JSON.stringify([
        createMockItem("item_1"),
        createMockItem("item_2"),
      ])

      render(
        <WishlistProvider>
          <TestComponent />
        </WishlistProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("2")
      })

      await act(async () => {
        screen.getByTestId("remove").click()
      })

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1")
        expect(screen.getByTestId("ids")).toHaveTextContent("item_2")
      })
    })
  })

  describe("isInWishlist", () => {
    it("returns true when item is in wishlist", async () => {
      localStorageMock.store["3dbyte-wishlist"] = JSON.stringify([
        createMockItem("item_1"),
      ])

      render(
        <WishlistProvider>
          <TestComponent />
        </WishlistProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("in-list")).toHaveTextContent("Yes")
      })
    })

    it("returns false when item is not in wishlist", async () => {
      render(
        <WishlistProvider>
          <TestComponent />
        </WishlistProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("in-list")).toHaveTextContent("No")
      })
    })
  })

  describe("clearWishlist", () => {
    it("clears all items", async () => {
      localStorageMock.store["3dbyte-wishlist"] = JSON.stringify([
        createMockItem("item_1"),
        createMockItem("item_2"),
      ])

      render(
        <WishlistProvider>
          <TestComponent />
        </WishlistProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("2")
      })

      await act(async () => {
        screen.getByTestId("clear").click()
      })

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("0")
      })
    })
  })

  describe("moveToCart", () => {
    it("adds item to cart and removes from wishlist", async () => {
      mockAddToCart.mockResolvedValue(undefined)
      localStorageMock.store["3dbyte-wishlist"] = JSON.stringify([
        createMockItem("item_1", "variant_1"),
      ])

      render(
        <WishlistProvider>
          <TestComponent />
        </WishlistProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1")
      })

      await act(async () => {
        screen.getByTestId("move-to-cart").click()
      })

      await waitFor(() => {
        expect(mockAddToCart).toHaveBeenCalledWith("variant_1", 1)
        expect(screen.getByTestId("count")).toHaveTextContent("0")
      })
    })

    it("does nothing if item has no variantId", async () => {
      const itemWithoutVariant = createMockItem("item_no_variant")
      delete itemWithoutVariant.variantId

      localStorageMock.store["3dbyte-wishlist"] = JSON.stringify([
        itemWithoutVariant,
      ])

      render(
        <WishlistProvider>
          <TestComponent />
        </WishlistProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1")
      })

      const { result } = renderHook(() => useWishlist(), {
        wrapper: WishlistProvider,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.moveToCart(itemWithoutVariant)
      })

      expect(mockAddToCart).not.toHaveBeenCalled()
    })
  })
})
