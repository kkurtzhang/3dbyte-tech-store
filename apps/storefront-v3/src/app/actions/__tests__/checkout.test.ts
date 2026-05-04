const mockCookies = jest.fn()
const mockRevalidatePath = jest.fn()
const mockUpdateCart = jest.fn()
const mockGetCart = jest.fn()
const mockInitiatePaymentSession = jest.fn()
const mockGetShippingOptions = jest.fn()
const mockGetLiveShippingRates = jest.fn()
const mockAddShippingMethod = jest.fn()

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
  addShippingMethod: (...args: unknown[]) => mockAddShippingMethod(...args),
  completePreorderCart: jest.fn(),
  getShippingOptions: (...args: unknown[]) => mockGetShippingOptions(...args),
  calculateShippingOption: jest.fn()
}))

jest.mock("@/lib/medusa/shipping", () => ({
  getLiveShippingRates: (...args: unknown[]) => mockGetLiveShippingRates(...args)
}))

import {
  getShippingOptionsAction,
  initPaymentSessionAction,
  setAddressesAction,
  setShippingMethodAction,
} from "../checkout"

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
    mockGetLiveShippingRates.mockResolvedValue({ rates: [] })
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
      success: true,
      paymentCollection: {
        payment_sessions: [
          expect.objectContaining({
            provider_id: "pp_stripe_stripe",
            data: { client_secret: "pi_secret" },
          }),
        ],
      },
    })

    expect(mockInitiatePaymentSession).toHaveBeenCalledWith({
      cart: { id: "cart_123" },
      data: {
        payment_method_types: ["card"],
      },
      providerId: "pp_stripe_stripe"
    })
  })

  it("returns a support-safe payment setup error for Stripe key permission failures", async () => {
    mockInitiatePaymentSession.mockRejectedValue(
      new Error(
        "An error occurred in InitiatePayment during creation of stripe payment intent: The provided key 'rk_test_hidden' does not have the required permissions for this endpoint."
      )
    )

    await expect(initPaymentSessionAction()).resolves.toEqual({
      success: false,
      error:
        "Payment setup is temporarily unavailable. Please contact support so we can complete your order.",
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

  it("sends a distinct billing address when checkout provides one", async () => {
    await expect(
      setAddressesAction({
        email: "engineer@example.com",
        first_name: "Ada",
        last_name: "Lovelace",
        address_1: "99 Shipping Road",
        address_2: "",
        city: "Hobart",
        province: "TAS",
        country_code: "au",
        postal_code: "7000",
        phone: "",
        billing_address: {
          first_name: "Grace",
          last_name: "Hopper",
          address_1: "12 Billing Street",
          address_2: "",
          city: "Melbourne",
          province: "VIC",
          country_code: "AU",
          postal_code: "3000",
          phone: "",
        },
      })
    ).resolves.toMatchObject({ success: true })

    expect(mockUpdateCart).toHaveBeenCalledWith({
      cartId: "cart_123",
      data: expect.objectContaining({
        shipping_address: expect.objectContaining({
          address_1: "99 Shipping Road",
          province: "TAS",
        }),
        billing_address: expect.objectContaining({
          address_1: "12 Billing Street",
          province: "VIC",
          country_code: "au",
        }),
      }),
    })
  })

  it("returns live Karrio shipping estimates as major-unit checkout amounts", async () => {
    mockGetShippingOptions.mockResolvedValue([
      {
        id: "ship_standard",
        name: "Karrio-Standard",
        description: "Economy",
        amount: 0,
        price_type: "calculated",
      },
    ])
    mockGetLiveShippingRates.mockResolvedValue({
      rates: [
        {
          id: "rat_standard",
          carrier: { id: "aramex-au", name: "Aramex", slug: "aramex" },
          service: "aramex_aunz_economy",
          serviceName: "Aramex Economy",
          totalCharge: 1591,
          currency: "AUD",
        },
      ],
    })

    await expect(getShippingOptionsAction()).resolves.toMatchObject({
      success: true,
      options: [
        {
          id: "ship_standard",
          amount: 15.91,
          name: "Aramex Economy",
        },
      ],
    })
  })

  it("persists the selected carrier rate on the Medusa shipping method", async () => {
    mockGetShippingOptions.mockResolvedValue([
      {
        id: "ship_karrio",
        name: "Karrio Calculated Shipping",
        description: "Live carrier rate",
      },
    ])
    mockAddShippingMethod.mockResolvedValue({ id: "cart_123" })

    await expect(
      setShippingMethodAction("ship_karrio", {
        selected_rate_id: "rat_priority",
        service: "aramex_aunz_priority",
        service_name: "Aramex Priority",
        carrier_id: "aramex-au",
        carrier_name: "Aramex",
        ignored: "not persisted",
      })
    ).resolves.toMatchObject({ success: true })

    expect(mockAddShippingMethod).toHaveBeenCalledWith({
      cartId: "cart_123",
      optionId: "ship_karrio",
      data: {
        code: "ship_karrio",
        description: "Live carrier rate",
        name: "Aramex Priority",
        selected_rate_id: "rat_priority",
        service: "aramex_aunz_priority",
        service_name: "Aramex Priority",
        carrier_id: "aramex-au",
        carrier_name: "Aramex",
      },
    })
  })
})
