const mockCookies = jest.fn()
const mockRevalidatePath = jest.fn()
const mockUpdateCart = jest.fn()
const mockGetCart = jest.fn()
const mockInitiatePaymentSession = jest.fn()

jest.mock("next/headers", () => ({
  cookies: (...args: unknown[]) => mockCookies(...args)
}))

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args)
}))

jest.mock("@/lib/medusa/cart", () => ({
  updateCart: (...args: unknown[]) => mockUpdateCart(...args),
  initiatePaymentSession: (...args: unknown[]) =>
    mockInitiatePaymentSession(...args),
  getCart: (...args: unknown[]) => mockGetCart(...args),
  addShippingMethod: jest.fn(),
  completePreorderCart: jest.fn(),
  getShippingOptions: jest.fn(),
  calculateShippingOption: jest.fn()
}))

jest.mock("@/lib/medusa/shipping", () => ({
  getLiveShippingRates: jest.fn()
}))

import { initPaymentSessionAction, setAddressesAction } from "../checkout"

const cookieStore = {
  get: jest.fn(() => ({ value: "cart_123" })),
  delete: jest.fn()
}

describe("checkout actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCookies.mockResolvedValue(cookieStore)
    mockGetCart.mockResolvedValue({ id: "cart_123" })
    mockUpdateCart.mockResolvedValue({ id: "cart_123" })
    mockInitiatePaymentSession.mockResolvedValue({
      payment_collection: {
        payment_sessions: [
          {
            provider_id: "pp_stripe_stripe",
            data: { client_secret: "pi_secret" }
          }
        ]
      }
    })
  })

  it("uses Medusa's registered Stripe payment provider id", async () => {
    await expect(initPaymentSessionAction()).resolves.toMatchObject({
      success: true
    })

    expect(mockInitiatePaymentSession).toHaveBeenCalledWith({
      cart: { id: "cart_123" },
      providerId: "pp_stripe_stripe"
    })
  })

  it("sends province to Medusa shipping and billing addresses", async () => {
    await expect(
      setAddressesAction({
        email: "engineer@example.com",
        first_name: "Ada",
        last_name: "Lovelace",
        address_1: "99 Manual Road",
        address_2: "",
        city: "Hobart",
        province: "TAS",
        country_code: "au",
        postal_code: "7000",
        phone: ""
      })
    ).resolves.toMatchObject({ success: true })

    expect(mockUpdateCart).toHaveBeenCalledWith({
      cartId: "cart_123",
      data: expect.objectContaining({
        shipping_address: expect.objectContaining({ province: "TAS" }),
        billing_address: expect.objectContaining({ province: "TAS" })
      })
    })
  })
})
