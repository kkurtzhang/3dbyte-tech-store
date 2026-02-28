import { render, screen, waitFor, renderHook, act } from "@testing-library/react"
import { CartProvider, useCart } from "../cart-context"
import * as cartApi from "@/lib/medusa/cart"
import type { StoreCart } from "@medusajs/types"

// Mock the cart API functions
jest.mock("@/lib/medusa/cart", () => ({
  createCart: jest.fn(),
  getCart: jest.fn(),
  addToCart: jest.fn(),
  updateLineItem: jest.fn(),
  deleteLineItem: jest.fn(),
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
  }
})()

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
})

// Helper to create mock cart
const createMockCart = (overrides?: Partial<StoreCart>): StoreCart =>
  ({
    id: "cart_123",
    items: [],
    total: 0,
    subtotal: 0,
    tax_total: 0,
    shipping_total: 0,
    discount_total: 0,
    currency_code: "aud",
    region_id: "region_123",
    ...overrides,
  }) as StoreCart

// Test wrapper component
const TestComponent = () => {
  const { cart, isLoading } = useCart()
  return (
    <div>
      <span data-testid="loading">{isLoading ? "Loading" : "Not Loading"}</span>
      <span data-testid="cart-id">{cart?.id || "No Cart"}</span>
    </div>
  )
}

describe("CartProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
  })

  describe("initialization", () => {
    it("starts in loading state", () => {
      ;(cartApi.getCart as jest.Mock).mockResolvedValue(createMockCart())

      render(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      )

      expect(screen.getByTestId("loading")).toHaveTextContent("Loading")
    })

    it("sets loading to false after initialization", async () => {
      render(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading")
      })
    })
  })

  describe("useCart hook", () => {
    it("throws error when used outside CartProvider", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()

      expect(() => {
        const TestComponentOutsideProvider = () => {
          useCart()
          return null
        }
        render(<TestComponentOutsideProvider />)
      }).toThrow("useCart must be used within a CartProvider")

      consoleSpy.mockRestore()
    })

    it("provides cart context values", async () => {
      ;(cartApi.getCart as jest.Mock).mockResolvedValue(createMockCart())

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      expect(result.current).toHaveProperty("cart")
      expect(result.current).toHaveProperty("isLoading")
      expect(result.current).toHaveProperty("addItem")
      expect(result.current).toHaveProperty("updateItem")
      expect(result.current).toHaveProperty("removeItem")
      expect(result.current).toHaveProperty("refreshCart")
    })
  })

  describe("addItem", () => {
    it("creates cart and adds item", async () => {
      const mockCart = createMockCart()
      const cartWithItem = createMockCart({ items: [{ id: "line_1" } as any] })
      ;(cartApi.createCart as jest.Mock).mockResolvedValue(mockCart)
      ;(cartApi.addToCart as jest.Mock).mockResolvedValue(cartWithItem)

      const { result } = renderHook(() => useCart(), {
        wrapper: CartProvider,
      })

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Add item
      await act(async () => {
        await result.current.addItem("variant_1", 1)
      })

      expect(cartApi.createCart).toHaveBeenCalled()
      expect(cartApi.addToCart).toHaveBeenCalledWith({
        cartId: "cart_123",
        variantId: "variant_1",
        quantity: 1,
      })
    })
  })
})
