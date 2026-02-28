import { render, screen, waitFor, act, renderHook } from "@testing-library/react"
import {
  InventoryAlertProvider,
  useInventoryAlerts,
  type InventoryAlert,
} from "../inventory-alert-context"

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

// Helper to create mock alert data
const createMockAlertData = () => ({
  productId: "prod_1",
  productHandle: "test-product",
  productTitle: "Test Product",
  variantTitle: "Default",
  variantId: "variant_1",
  email: "test@example.com",
})

// Test component
const TestComponent = () => {
  const {
    alerts,
    isLoading,
    addAlert,
    removeAlert,
    removeAlertByProduct,
    clearAlerts,
    hasAlert,
  } = useInventoryAlerts()

  return (
    <div>
      <span data-testid="loading">{isLoading ? "Loading" : "Not Loading"}</span>
      <span data-testid="count">{alerts.length}</span>
      <span data-testid="ids">{alerts.map((a) => a.id).join(",")}</span>
      <button onClick={() => addAlert(createMockAlertData())} data-testid="add">
        Add Alert
      </button>
      <button onClick={() => removeAlert(alerts[0]?.id)} data-testid="remove">
        Remove
      </button>
      <button
        onClick={() => removeAlertByProduct("prod_1", "variant_1")}
        data-testid="remove-by-product"
      >
        Remove by Product
      </button>
      <button onClick={() => clearAlerts()} data-testid="clear">
        Clear
      </button>
      <span data-testid="has-alert">
        {hasAlert("prod_1", "variant_1") ? "Yes" : "No"}
      </span>
    </div>
  )
}

describe("InventoryAlertProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
  })

  describe("initialization", () => {
    it("starts in loading state", () => {
      render(
        <InventoryAlertProvider>
          <TestComponent />
        </InventoryAlertProvider>
      )

      expect(screen.getByTestId("loading")).toHaveTextContent("Loading")
    })

    it("sets loading to false after initialization", async () => {
      render(
        <InventoryAlertProvider>
          <TestComponent />
        </InventoryAlertProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading")
      })
    })

    it("loads alerts from localStorage", async () => {
      const storedAlert: InventoryAlert = {
        ...createMockAlertData(),
        id: "alert_stored",
        createdAt: new Date().toISOString(),
        notified: false,
      }
      localStorageMock.store["inventory_alerts"] = JSON.stringify([storedAlert])

      render(
        <InventoryAlertProvider>
          <TestComponent />
        </InventoryAlertProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1")
        expect(screen.getByTestId("ids")).toHaveTextContent("alert_stored")
      })
    })
  })

  describe("useInventoryAlerts hook", () => {
    it("throws error when used outside InventoryAlertProvider", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation()

      expect(() => {
        renderHook(() => useInventoryAlerts())
      }).toThrow("useInventoryAlerts must be used within an InventoryAlertProvider")

      consoleSpy.mockRestore()
    })

    it("provides context values", async () => {
      const { result } = renderHook(() => useInventoryAlerts(), {
        wrapper: InventoryAlertProvider,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current).toHaveProperty("alerts")
      expect(result.current).toHaveProperty("addAlert")
      expect(result.current).toHaveProperty("removeAlert")
      expect(result.current).toHaveProperty("removeAlertByProduct")
      expect(result.current).toHaveProperty("clearAlerts")
      expect(result.current).toHaveProperty("hasAlert")
    })
  })

  describe("addAlert", () => {
    it("adds alert with generated id and timestamp", async () => {
      const { result } = renderHook(() => useInventoryAlerts(), {
        wrapper: InventoryAlertProvider,
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.addAlert(createMockAlertData())
      })

      await waitFor(() => {
        expect(result.current.alerts.length).toBe(1)
        expect(result.current.alerts[0].id).toMatch(/^alert_/)
        expect(result.current.alerts[0].createdAt).toBeDefined()
        expect(result.current.alerts[0].notified).toBe(false)
      })
    })
  })

  describe("removeAlert", () => {
    it("removes alert by id", async () => {
      const storedAlert: InventoryAlert = {
        ...createMockAlertData(),
        id: "alert_to_remove",
        createdAt: new Date().toISOString(),
        notified: false,
      }
      localStorageMock.store["inventory_alerts"] = JSON.stringify([storedAlert])

      render(
        <InventoryAlertProvider>
          <TestComponent />
        </InventoryAlertProvider>
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

  describe("removeAlertByProduct", () => {
    it("removes alert by product and variant id", async () => {
      const storedAlert: InventoryAlert = {
        ...createMockAlertData(),
        id: "alert_prod1",
        createdAt: new Date().toISOString(),
        notified: false,
      }
      const otherAlert: InventoryAlert = {
        ...createMockAlertData(),
        id: "alert_prod2",
        productId: "prod_2",
        variantId: "variant_2",
        createdAt: new Date().toISOString(),
        notified: false,
      }
      localStorageMock.store["inventory_alerts"] = JSON.stringify([
        storedAlert,
        otherAlert,
      ])

      render(
        <InventoryAlertProvider>
          <TestComponent />
        </InventoryAlertProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("2")
      })

      await act(async () => {
        screen.getByTestId("remove-by-product").click()
      })

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1")
        expect(screen.getByTestId("ids")).toHaveTextContent("alert_prod2")
      })
    })
  })

  describe("hasAlert", () => {
    it("returns true when alert exists", async () => {
      const storedAlert: InventoryAlert = {
        ...createMockAlertData(),
        id: "alert_1",
        createdAt: new Date().toISOString(),
        notified: false,
      }
      localStorageMock.store["inventory_alerts"] = JSON.stringify([storedAlert])

      render(
        <InventoryAlertProvider>
          <TestComponent />
        </InventoryAlertProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("has-alert")).toHaveTextContent("Yes")
      })
    })

    it("returns false when no alert exists", async () => {
      render(
        <InventoryAlertProvider>
          <TestComponent />
        </InventoryAlertProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("has-alert")).toHaveTextContent("No")
      })
    })
  })

  describe("clearAlerts", () => {
    it("clears all alerts", async () => {
      const storedAlert: InventoryAlert = {
        ...createMockAlertData(),
        id: "alert_1",
        createdAt: new Date().toISOString(),
        notified: false,
      }
      localStorageMock.store["inventory_alerts"] = JSON.stringify([storedAlert])

      render(
        <InventoryAlertProvider>
          <TestComponent />
        </InventoryAlertProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1")
      })

      await act(async () => {
        screen.getByTestId("clear").click()
      })

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("0")
      })
    })
  })
})
