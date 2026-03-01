import { render, screen, waitFor, act, renderHook } from "@testing-library/react"
import { CompareProvider, useCompare, type CompareItem } from "../compare-context"

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

// Helper to create mock compare item
const createMockItem = (id: string): CompareItem => ({
  id,
  handle: `product-${id}`,
  title: `Product ${id}`,
  thumbnail: `/thumbnail-${id}.jpg`,
  price: {
    amount: 1000,
    currency_code: "aud",
  },
  specs: [
    { label: "Weight", value: "1kg" },
    { label: "Size", value: "10cm" },
  ],
})

// Test component
const TestComponent = () => {
  const {
    compareList,
    isLoading,
    addToCompare,
    removeFromCompare,
    isInCompare,
    clearCompare,
    toggleCompare,
  } = useCompare()

  return (
    <div>
      <span data-testid="loading">{isLoading ? "Loading" : "Not Loading"}</span>
      <span data-testid="count">{compareList.length}</span>
      <span data-testid="ids">{compareList.map((i) => i.id).join(",")}</span>
      <button
        onClick={() => addToCompare(createMockItem("item_1"))}
        data-testid="add"
      >
        Add
      </button>
      <button onClick={() => removeFromCompare("item_1")} data-testid="remove">
        Remove
      </button>
      <button onClick={() => clearCompare()} data-testid="clear">
        Clear
      </button>
      <button
        onClick={() => toggleCompare(createMockItem("item_2"))}
        data-testid="toggle"
      >
        Toggle
      </button>
      <span data-testid="in-list">
        {isInCompare("item_1") ? "Yes" : "No"}
      </span>
    </div>
  )
}

describe("CompareProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
  })

  describe("initialization", () => {
    it("starts in loading state", () => {
      render(
        <CompareProvider>
          <TestComponent />
        </CompareProvider>
      )

      expect(screen.getByTestId("loading")).toHaveTextContent("Loading")
    })

    it("sets loading to false after initialization", async () => {
      render(
        <CompareProvider>
          <TestComponent />
        </CompareProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading")
      })
    })

    it("loads items from localStorage", async () => {
      localStorageMock.store["3dbyte-compare"] = JSON.stringify([
        createMockItem("stored_1"),
      ])

      render(
        <CompareProvider>
          <TestComponent />
        </CompareProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1")
        expect(screen.getByTestId("ids")).toHaveTextContent("stored_1")
      })
    })
  })

  describe("useCompare hook", () => {
    it("throws error when used outside CompareProvider", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()

      expect(() => {
        renderHook(() => useCompare())
      }).toThrow("useCompare must be used within a CompareProvider")

      consoleSpy.mockRestore()
    })

    it("provides compare context values", async () => {
      const { result } = renderHook(() => useCompare(), {
        wrapper: CompareProvider,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current).toHaveProperty("compareList")
      expect(result.current).toHaveProperty("addToCompare")
      expect(result.current).toHaveProperty("removeFromCompare")
      expect(result.current).toHaveProperty("isInCompare")
      expect(result.current).toHaveProperty("clearCompare")
      expect(result.current).toHaveProperty("toggleCompare")
    })
  })

  describe("addToCompare", () => {
    it("adds item to compare list", async () => {
      render(
        <CompareProvider>
          <TestComponent />
        </CompareProvider>
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
        <CompareProvider>
          <TestComponent />
        </CompareProvider>
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

    it("limits to 4 items", async () => {
      const { result } = renderHook(() => useCompare(), {
        wrapper: CompareProvider,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Add 5 items
      act(() => {
        result.current.addToCompare(createMockItem("item_1"))
        result.current.addToCompare(createMockItem("item_2"))
        result.current.addToCompare(createMockItem("item_3"))
        result.current.addToCompare(createMockItem("item_4"))
        result.current.addToCompare(createMockItem("item_5"))
      })

      await waitFor(() => {
        expect(result.current.compareList.length).toBe(4)
      })
    })
  })

  describe("removeFromCompare", () => {
    it("removes item from compare list", async () => {
      localStorageMock.store["3dbyte-compare"] = JSON.stringify([
        createMockItem("item_1"),
        createMockItem("item_2"),
      ])

      render(
        <CompareProvider>
          <TestComponent />
        </CompareProvider>
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

  describe("isInCompare", () => {
    it("returns true when item is in list", async () => {
      localStorageMock.store["3dbyte-compare"] = JSON.stringify([
        createMockItem("item_1"),
      ])

      render(
        <CompareProvider>
          <TestComponent />
        </CompareProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("in-list")).toHaveTextContent("Yes")
      })
    })

    it("returns false when item is not in list", async () => {
      render(
        <CompareProvider>
          <TestComponent />
        </CompareProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("in-list")).toHaveTextContent("No")
      })
    })
  })

  describe("clearCompare", () => {
    it("clears all items", async () => {
      localStorageMock.store["3dbyte-compare"] = JSON.stringify([
        createMockItem("item_1"),
        createMockItem("item_2"),
      ])

      render(
        <CompareProvider>
          <TestComponent />
        </CompareProvider>
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

  describe("toggleCompare", () => {
    it("adds item if not in list", async () => {
      render(
        <CompareProvider>
          <TestComponent />
        </CompareProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading")
      })

      await act(async () => {
        screen.getByTestId("toggle").click()
      })

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1")
        expect(screen.getByTestId("ids")).toHaveTextContent("item_2")
      })
    })

    it("removes item if already in list", async () => {
      localStorageMock.store["3dbyte-compare"] = JSON.stringify([
        createMockItem("item_2"),
      ])

      render(
        <CompareProvider>
          <TestComponent />
        </CompareProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1")
      })

      await act(async () => {
        screen.getByTestId("toggle").click()
      })

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("0")
      })
    })
  })
})
