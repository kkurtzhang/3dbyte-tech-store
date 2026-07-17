import { createOrderAccessToken } from "@/lib/order-access/token"

const mockCookies = jest.fn()
const mockGetOrder = jest.fn()
const mockNotFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND")
})

jest.mock("next/headers", () => ({
  cookies: (...args: unknown[]) => mockCookies(...args),
}))

jest.mock("next/navigation", () => ({
  notFound: (...args: unknown[]) => mockNotFound(...args),
}))

jest.mock("@/lib/medusa/orders", () => ({
  getOrder: (...args: unknown[]) => mockGetOrder(...args),
}))

jest.mock("@/features/order/components/order-summary", () => ({
  getCustomerOrderNumber: () => "3DB-123",
  getOrderTrackingReference: () => "3DB-123",
  OrderSummary: () => <div>Order summary</div>,
}))

jest.mock("@/components/print-button", () => ({
  PrintButton: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
}))

jest.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock("lucide-react", () => ({
  CheckCircle2: () => <span aria-hidden="true" />,
}))

import OrderConfirmedPage from "../page"

const secret = "test-order-access-secret-that-is-at-least-32-bytes"

describe("order confirmation access", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ORDER_ACCESS_TOKEN_SECRET = secret
    mockGetOrder.mockResolvedValue({ id: "order_123" })
  })

  it("does not retrieve an order without a valid proof cookie", async () => {
    mockCookies.mockResolvedValue({ get: jest.fn(() => undefined) })

    await expect(
      OrderConfirmedPage({ params: Promise.resolve({ id: "order_123" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND")

    expect(mockGetOrder).not.toHaveBeenCalled()
  })

  it("retrieves the exact order authorized by the proof cookie", async () => {
    const token = createOrderAccessToken({ orderId: "order_123", secret })
    mockCookies.mockResolvedValue({
      get: jest.fn(() => ({ value: token })),
    })

    await OrderConfirmedPage({
      params: Promise.resolve({ id: "order_123" }),
    })

    expect(mockGetOrder).toHaveBeenCalledWith("order_123")
  })
})
