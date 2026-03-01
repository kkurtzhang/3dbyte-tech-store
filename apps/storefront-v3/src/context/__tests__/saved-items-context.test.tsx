import { render, screen, waitFor, act, renderHook } from "@testing-library/react"
import { SavedItemsProvider, useSavedItems } from "../saved-items-context"
import type { StoreCartLineItem } from "@medusajs/types"

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

// Helper to create mock line item
const createMockItem = (id: string): StoreCartLineItem =>
  ({
    id,
    product_id: `prod_${id}`,
    variant_id: `variant_${id}`,
    product_title: `Product ${id}`,
    title: `Variant ${id}`,
    quantity: 1,
    unit_price: 1000,
    subtotal: 1000,
    total: 1000,
  }) as StoreCartLineItem

// Test component
const TestComponent = () => {
  const {
    savedItems,
    isLoading,
    saveItem,
    removeSavedItem,
    moveToCart,
    isSaved,
  } = useSavedItems()

  return (
    <div>
      <span data-testid="loading">{isLoading ? "Loading" : "Not Loading"}</span>
      <span data-testid="count">{savedItems.length}</span>
      <span data-testid="ids">{savedItems.map((i) => i.id).join(",")}</span>
      <button onClick={() => saveItem(createMockItem("item_1"))} data-testid="save">
        Save
      </button>
      <button onClick={() => removeSavedItem("item_1")} data-testid="remove">
        Remove
      </button>
      <button onClick={() => moveToCart(savedItems[0])} data-testid="move">
        Move to Cart
      </button>
      <span data-testid="is-saved">{isSaved("item_1") ? "Yes" : "No"}</span>
    </div>
  )
}

describe("SavedItemsProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
  })

  describe("initialization", () => {
    it("starts in loading state", () => {
      render(
        <SavedItemsProvider>
          <TestComponent />
        </SavedItemsProvider>
      )

      expect(screen.getByTestId("loading")).toHaveTextContent("Loading")
    })

    it("sets loading to false after initialization", async () => {
      render(
        <SavedItemsProvider>
          <TestComponent />
        </SavedItemsProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading")
      })
    })

    it("loads items from localStorage", async () => {
      const storedItem = {
        ...createMockItem("stored_1"),
        savedAt: Date.now(),
      }
      localStorageMock.store["saved_items"] = JSON.stringify([storedItem])

      render(
        <SavedItemsProvider>
          <TestComponent />
        </SavedItemsProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1")
        expect(screen.getByTestId("ids")).toHaveTextContent("stored_1")
      })
    })
  })

  describe("useSavedItems hook", () => {
    it("throws error when used outside SavedItemsProvider", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()

      expect(() => {
        renderHook(() => useSavedItems())
      }).toThrow("useSavedItems must be used within a SavedItemsProvider")

      consoleSpy.mockRestore()
    })

    it("provides context values", async () => {
      const { result } = renderHook(() => useSavedItems(), {
        wrapper: SavedItemsProvider,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current).toHaveProperty("savedItems")
      expect(result.current).toHaveProperty("saveItem")
      expect(result.current).toHaveProperty("removeSavedItem")
      expect(result.current).toHaveProperty("moveToCart")
      expect(result.current).toHaveProperty("isSaved")
    })
  })

  describe("saveItem", () => {
    it("saves item with timestamp", async () => {
      const { result } = renderHook(() => useSavedItems(), {
        wrapper: SavedItemsProvider,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.saveItem(createMockItem("item_1"))
      })

      await waitFor(() => {
        expect(result.current.savedItems.length).toBe(1)
        expect(result.current.savedItems[0].savedAt).toBeDefined()
      })
    })

    it("does not save duplicate items", async () => {
      render(
        <SavedItemsProvider>
          <TestComponent />
        </SavedItemsProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading")
      })

      await act(async () => {
        screen.getByTestId("save").click()
      })
      await act(async () => {
        screen.getByTestId("save").click()
      })

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1")
      })
    })
  })

  describe("removeSavedItem", () => {
    it("removes item from saved list", async () => {
      const storedItem = {
        ...createMockItem("item_1"),
        savedAt: Date.now(),
      }
      localStorageMock.store["saved_items"] = JSON.stringify([storedItem])

      render(
        <SavedItemsProvider>
          <TestComponent />
        </SavedItemsProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1")
      })

      await act(async () => {
        screen.getByTestId("remove").click()
      })

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("0")
      })
    })
  })

  describe("moveToCart", () => {
    it("removes item from saved list", async () => {
      const storedItem = {
        ...createMockItem("item_1"),
        savedAt: Date.now(),
      }
      localStorageMock.store["saved_items"] = JSON.stringify([storedItem])

      render(
        <SavedItemsProvider>
          <TestComponent />
        </SavedItemsProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1")
      })

      await act(async () => {
        screen.getByTestId("move").click()
      })

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("0")
      })
    })
  })

  describe("isSaved", () => {
    it("returns true when item is saved", async () => {
      const storedItem = {
        ...createMockItem("item_1"),
        savedAt: Date.now(),
      }
      localStorageMock.store["saved_items"] = JSON.stringify([storedItem])

      render(
        <SavedItemsProvider>
          <TestComponent />
        </SavedItemsProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("is-saved")).toHaveTextContent("Yes")
      })
    })

    it("returns false when item is not saved", async () => {
      render(
        <SavedItemsProvider>
          <TestComponent />
        </SavedItemsProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("is-saved")).toHaveTextContent("No")
      })
    })
  })
})
