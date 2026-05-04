const mockRetrieveOrder = jest.fn()
const mockFetch = jest.fn()

global.fetch = mockFetch as unknown as typeof fetch

jest.mock("@/lib/medusa/client", () => ({
  sdk: {
    store: {
      order: {
        retrieve: (...args: unknown[]) => mockRetrieveOrder(...args),
      },
    },
  },
}))

import { lookupOrder } from "../track-order"

describe("track order action", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL = "http://localhost:9000"
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_test"
    mockRetrieveOrder.mockResolvedValue({
      order: {
        id: "order_1",
        email: "customer@example.com",
      },
    })
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ payment_method: null }),
    })
  })

  it("requests the payment, fulfillment, shipping, and rich line item fields needed by tracking", async () => {
    await expect(
      lookupOrder(" order_1 ", " CUSTOMER@example.com ")
    ).resolves.toMatchObject({
      success: true,
      order: {
        id: "order_1",
      },
    })

    expect(mockRetrieveOrder).toHaveBeenCalledWith("order_1", {
      fields: expect.stringContaining("*payment_collections.payments"),
    })
    expect(mockRetrieveOrder).toHaveBeenCalledWith("order_1", {
      fields: expect.stringContaining("*items.variant.preorder_variant.prices"),
    })
    expect(mockRetrieveOrder).toHaveBeenCalledWith("order_1", {
      fields: expect.stringContaining("*shipping_methods"),
    })
    expect(mockRetrieveOrder).toHaveBeenCalledWith("order_1", {
      fields: expect.stringContaining("fulfillment_status"),
    })
  })

  it("adds the verified safe card payment method to the tracked order", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        payment_method: {
          type: "card",
          brand: "visa",
          last4: "4242",
        },
      }),
    })

    await expect(
      lookupOrder("order_1", "customer@example.com")
    ).resolves.toMatchObject({
      success: true,
      order: {
        tracking_payment_method: {
          type: "card",
          brand: "visa",
          last4: "4242",
        },
      },
    })

    expect(mockFetch).toHaveBeenCalledWith(
      new URL(
        "http://localhost:9000/store/orders/order_1/payment-method?email=customer%40example.com"
      ),
      expect.objectContaining({
        cache: "no-store",
        headers: {
          "x-publishable-api-key": "pk_test",
        },
      })
    )
  })
})
