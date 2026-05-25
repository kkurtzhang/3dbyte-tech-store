import type { ReactNode } from "react"
import { act, render, renderHook, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  addWaitlistItemAction,
  clearWaitlistAction,
  getWaitlistAction,
  removeWaitlistItemAction,
} from "@/app/actions/waitlist"
import {
  InventoryAlertProvider,
  useInventoryAlerts,
  type InventoryAlert,
} from "../inventory-alert-context"

jest.mock("@/app/actions/waitlist", () => ({
  getWaitlistAction: jest.fn(),
  addWaitlistItemAction: jest.fn(),
  removeWaitlistItemAction: jest.fn(),
  clearWaitlistAction: jest.fn(),
}))

const mockGetWaitlistAction = getWaitlistAction as jest.MockedFunction<
  typeof getWaitlistAction
>
const mockAddWaitlistItemAction = addWaitlistItemAction as jest.MockedFunction<
  typeof addWaitlistItemAction
>
const mockRemoveWaitlistItemAction =
  removeWaitlistItemAction as jest.MockedFunction<typeof removeWaitlistItemAction>
const mockClearWaitlistAction = clearWaitlistAction as jest.MockedFunction<
  typeof clearWaitlistAction
>

const createMockAlert = (
  productId: string,
  waitlistId = `wait_${productId}`,
  variantId = `variant_${productId}`
): InventoryAlert => ({
  id: productId,
  waitlistId,
  productId,
  productHandle: `product-${productId}`,
  productTitle: `Product ${productId}`,
  variantTitle: "Black - 180",
  variantId,
  email: "ava@example.com",
  createdAt: "2026-05-12T00:00:00.000Z",
  notified: false,
})

const createMockAlertInput = () => ({
  productId: "prod_2",
  productHandle: "test-product",
  productTitle: "Test Product",
  variantTitle: "Black - 180",
  variantId: "variant_2",
})

const wrapper = ({ children }: { children: ReactNode }) => (
  <InventoryAlertProvider>{children}</InventoryAlertProvider>
)

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
      <span data-testid="ids">{alerts.map((alert) => alert.id).join(",")}</span>
      <button
        onClick={() => void addAlert(createMockAlertInput())}
        data-testid="add"
      >
        Add Alert
      </button>
      <button onClick={() => void removeAlert(alerts[0]?.id)} data-testid="remove">
        Remove
      </button>
      <button
        onClick={() => void removeAlertByProduct("prod_1", "variant_1")}
        data-testid="remove-by-product"
      >
        Remove by Product
      </button>
      <button onClick={() => void clearAlerts()} data-testid="clear">
        Clear
      </button>
      <span data-testid="has-alert">
        {hasAlert("prod_1", "variant_1") ? "Yes" : "No"}
      </span>
    </div>
  )
}

describe("InventoryAlertProvider", () => {
  const serverAlert = createMockAlert("prod_1", "wait_1", "variant_1")

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetWaitlistAction.mockResolvedValue({
      success: true,
      customerEmail: "ava@example.com",
      waitlist: [serverAlert],
    })
    mockAddWaitlistItemAction.mockResolvedValue({
      success: true,
      item: createMockAlert("prod_2", "wait_2", "variant_2"),
    })
    mockRemoveWaitlistItemAction.mockResolvedValue({ success: true })
    mockClearWaitlistAction.mockResolvedValue({ success: true })
  })

  it("starts in loading state", () => {
    mockGetWaitlistAction.mockReturnValue(new Promise(() => {}))

    render(
      <InventoryAlertProvider>
        <TestComponent />
      </InventoryAlertProvider>
    )

    expect(screen.getByTestId("loading")).toHaveTextContent("Loading")
  })

  it("loads alerts from the server", async () => {
    render(
      <InventoryAlertProvider>
        <TestComponent />
      </InventoryAlertProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading")
      expect(screen.getByTestId("count")).toHaveTextContent("1")
      expect(screen.getByTestId("ids")).toHaveTextContent("prod_1")
    })
  })

  it("does not read or write localStorage", async () => {
    const getItem = jest.spyOn(Storage.prototype, "getItem")
    const setItem = jest.spyOn(Storage.prototype, "setItem")

    render(
      <InventoryAlertProvider>
        <TestComponent />
      </InventoryAlertProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading")
    })

    expect(getItem).not.toHaveBeenCalledWith("inventory_alerts")
    expect(setItem).not.toHaveBeenCalledWith(
      "inventory_alerts",
      expect.any(String)
    )
  })

  it("throws when used outside InventoryAlertProvider", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation()

    expect(() => renderHook(() => useInventoryAlerts())).toThrow(
      "useInventoryAlerts must be used within an InventoryAlertProvider"
    )

    consoleSpy.mockRestore()
  })

  it("adds an alert with the server action result", async () => {
    const user = userEvent.setup()

    render(
      <InventoryAlertProvider>
        <TestComponent />
      </InventoryAlertProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("Not Loading")
    })

    await user.click(screen.getByTestId("add"))

    await waitFor(() => {
      expect(mockAddWaitlistItemAction).toHaveBeenCalledWith(createMockAlertInput())
      expect(screen.getByTestId("count")).toHaveTextContent("2")
      expect(screen.getByTestId("ids")).toHaveTextContent("prod_1,prod_2")
    })
  })

  it("does not create a duplicate when the item is already loaded", async () => {
    const { result } = renderHook(() => useInventoryAlerts(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.addAlert(createMockAlertInput())
      await result.current.addAlert({
        productId: "prod_1",
        productHandle: "product-prod_1",
        productTitle: "Product prod_1",
        variantId: "variant_1",
        variantTitle: "Black - 180",
      })
    })

    expect(mockAddWaitlistItemAction).toHaveBeenCalledTimes(1)
    expect(result.current.alerts).toHaveLength(2)
  })

  it("removes an alert by its server waitlist id", async () => {
    const user = userEvent.setup()

    render(
      <InventoryAlertProvider>
        <TestComponent />
      </InventoryAlertProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("1")
    })

    await user.click(screen.getByTestId("remove"))

    await waitFor(() => {
      expect(mockRemoveWaitlistItemAction).toHaveBeenCalledWith("wait_1")
      expect(screen.getByTestId("count")).toHaveTextContent("0")
      expect(screen.getByTestId("has-alert")).toHaveTextContent("No")
    })
  })

  it("removes an alert by product and variant", async () => {
    const user = userEvent.setup()

    render(
      <InventoryAlertProvider>
        <TestComponent />
      </InventoryAlertProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("1")
    })

    await user.click(screen.getByTestId("remove-by-product"))

    await waitFor(() => {
      expect(mockRemoveWaitlistItemAction).toHaveBeenCalledWith("wait_1")
      expect(screen.getByTestId("count")).toHaveTextContent("0")
    })
  })

  it("clears alerts through the server action", async () => {
    const user = userEvent.setup()

    render(
      <InventoryAlertProvider>
        <TestComponent />
      </InventoryAlertProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("1")
    })

    await user.click(screen.getByTestId("clear"))

    await waitFor(() => {
      expect(mockClearWaitlistAction).toHaveBeenCalled()
      expect(screen.getByTestId("count")).toHaveTextContent("0")
    })
  })
})
