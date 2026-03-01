import { renderHook, act, waitFor } from "@testing-library/react"
import { useRecentlyViewed } from "../use-recently-viewed"
import type { StoreProduct } from "@medusajs/types"

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

// Helper to create mock product
const createMockProduct = (id: string): StoreProduct =>
  ({
    id,
    handle: `product-${id}`,
    title: `Product ${id}`,
    thumbnail: `/thumbnail-${id}.jpg`,
    variants: [
      {
        id: `variant_${id}`,
        calculated_price: {
          calculated_amount: 1000,
          currency_code: "aud",
        },
        prices: [{ amount: 1000, currency_code: "aud" }],
      },
    ],
  }) as unknown as StoreProduct

describe("useRecentlyViewed", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
  })

  describe("initialization", () => {
    it("starts with empty array", async () => {
      const { result } = renderHook(() => useRecentlyViewed())

      await waitFor(() => {
        expect(result.current.recentlyViewed).toEqual([])
      })
    })

    it("loads items from localStorage", async () => {
      const storedItem = {
        id: "stored_1",
        handle: "product-stored",
        title: "Stored Product",
        thumbnail: "/thumb.jpg",
        price: 1000,
        currencyCode: "aud",
        viewedAt: new Date().toISOString(),
      }
      localStorageMock.store["recently-viewed-products"] = JSON.stringify([
        storedItem,
      ])

      const { result } = renderHook(() => useRecentlyViewed())

      await waitFor(() => {
        expect(result.current.recentlyViewed.length).toBe(1)
        expect(result.current.recentlyViewed[0].id).toBe("stored_1")
      })
    })
  })

  describe("addToRecentlyViewed", () => {
    it("adds product to the beginning of the list", async () => {
      const { result } = renderHook(() => useRecentlyViewed())

      await waitFor(() => {
        expect(result.current.recentlyViewed).toEqual([])
      })

      act(() => {
        result.current.addToRecentlyViewed(createMockProduct("prod_1"))
      })

      await waitFor(() => {
        expect(result.current.recentlyViewed.length).toBe(1)
        expect(result.current.recentlyViewed[0].id).toBe("prod_1")
      })
    })

    it("moves existing product to the beginning", async () => {
      const { result } = renderHook(() => useRecentlyViewed())

      act(() => {
        result.current.addToRecentlyViewed(createMockProduct("prod_1"))
        result.current.addToRecentlyViewed(createMockProduct("prod_2"))
      })

      await waitFor(() => {
        expect(result.current.recentlyViewed[0].id).toBe("prod_2")
        expect(result.current.recentlyViewed[1].id).toBe("prod_1")
      })

      act(() => {
        result.current.addToRecentlyViewed(createMockProduct("prod_1"))
      })

      await waitFor(() => {
        expect(result.current.recentlyViewed[0].id).toBe("prod_1")
        expect(result.current.recentlyViewed[1].id).toBe("prod_2")
        expect(result.current.recentlyViewed.length).toBe(2)
      })
    })

    it("limits to 20 items", async () => {
      const { result } = renderHook(() => useRecentlyViewed())

      // Add 25 items
      act(() => {
        for (let i = 0; i < 25; i++) {
          result.current.addToRecentlyViewed(createMockProduct(`prod_${i}`))
        }
      })

      await waitFor(() => {
        expect(result.current.recentlyViewed.length).toBe(20)
        // Most recent should be first
        expect(result.current.recentlyViewed[0].id).toBe("prod_24")
      })
    })

    it("includes product details", async () => {
      const { result } = renderHook(() => useRecentlyViewed())

      act(() => {
        result.current.addToRecentlyViewed(createMockProduct("prod_1"))
      })

      await waitFor(() => {
        const item = result.current.recentlyViewed[0]
        expect(item.id).toBe("prod_1")
        expect(item.handle).toBe("product-prod_1")
        expect(item.title).toBe("Product prod_1")
        expect(item.thumbnail).toBe("/thumbnail-prod_1.jpg")
        expect(item.price).toBe(1000)
        expect(item.currencyCode).toBe("aud")
        expect(item.viewedAt).toBeDefined()
      })
    })
  })

  describe("removeFromRecentlyViewed", () => {
    it("removes product by id", async () => {
      const { result } = renderHook(() => useRecentlyViewed())

      act(() => {
        result.current.addToRecentlyViewed(createMockProduct("prod_1"))
        result.current.addToRecentlyViewed(createMockProduct("prod_2"))
      })

      await waitFor(() => {
        expect(result.current.recentlyViewed.length).toBe(2)
      })

      act(() => {
        result.current.removeFromRecentlyViewed("prod_1")
      })

      await waitFor(() => {
        expect(result.current.recentlyViewed.length).toBe(1)
        expect(result.current.recentlyViewed[0].id).toBe("prod_2")
      })
    })

    it("does nothing if product not found", async () => {
      const { result } = renderHook(() => useRecentlyViewed())

      act(() => {
        result.current.addToRecentlyViewed(createMockProduct("prod_1"))
      })

      await waitFor(() => {
        expect(result.current.recentlyViewed.length).toBe(1)
      })

      act(() => {
        result.current.removeFromRecentlyViewed("non_existent")
      })

      await waitFor(() => {
        expect(result.current.recentlyViewed.length).toBe(1)
      })
    })
  })

  describe("clearRecentlyViewed", () => {
    it("clears all items", async () => {
      const { result } = renderHook(() => useRecentlyViewed())

      act(() => {
        result.current.addToRecentlyViewed(createMockProduct("prod_1"))
        result.current.addToRecentlyViewed(createMockProduct("prod_2"))
      })

      await waitFor(() => {
        expect(result.current.recentlyViewed.length).toBe(2)
      })

      act(() => {
        result.current.clearRecentlyViewed()
      })

      await waitFor(() => {
        expect(result.current.recentlyViewed.length).toBe(0)
      })
    })
  })
})
