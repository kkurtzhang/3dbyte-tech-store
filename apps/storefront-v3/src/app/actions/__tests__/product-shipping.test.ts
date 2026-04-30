const mockAddLineItems = jest.fn()
const mockAddToCart = jest.fn()
const mockCreateCart = jest.fn()
const mockGetShippingOptions = jest.fn()
const mockGetLiveShippingRates = jest.fn()
const mockUpdateCart = jest.fn()
const mockCalculate = jest.fn()

jest.mock("@/lib/medusa/cart", () => ({
  addLineItems: (...args: unknown[]) => mockAddLineItems(...args),
  addToCart: (...args: unknown[]) => mockAddToCart(...args),
  createCart: (...args: unknown[]) => mockCreateCart(...args),
  getShippingOptions: (...args: unknown[]) => mockGetShippingOptions(...args),
  updateCart: (...args: unknown[]) => mockUpdateCart(...args),
}))

jest.mock("@/lib/medusa/client", () => ({
  sdk: {
    store: {
      fulfillment: {
        calculate: (...args: unknown[]) => mockCalculate(...args),
      },
    },
  },
}))

jest.mock("@/lib/medusa/shipping", () => ({
  getLiveShippingRates: (...args: unknown[]) => mockGetLiveShippingRates(...args),
}))

import { estimateProductShippingAction } from "../product-shipping"

describe("estimateProductShippingAction", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateCart.mockResolvedValue({
      id: "cart_123",
      region: { currency_code: "aud" },
    })
    mockAddToCart.mockResolvedValue({})
    mockAddLineItems.mockResolvedValue({})
    mockGetLiveShippingRates.mockResolvedValue({ rates: [] })
    mockUpdateCart.mockResolvedValue({})
  })

  it("uses direct Karrio live rates for PDP estimates", async () => {
    mockGetLiveShippingRates.mockResolvedValue({
      rates: [
        {
          id: "rat_economy",
          carrier: { id: "aramex-au", name: "Aramex", slug: "aramex_aunz" },
          service: "aramex_aunz_economy",
          serviceName: "Aramex Economy",
          totalCharge: 1119,
          currency: "AUD",
          transitDays: 6,
        },
        {
          id: "rat_priority",
          carrier: { id: "aramex-au", name: "Aramex", slug: "aramex_aunz" },
          service: "aramex_aunz_priority",
          serviceName: "Aramex Priority",
          totalCharge: 1779,
          currency: "AUD",
          transitDays: 5,
        },
      ],
    })

    await expect(
      estimateProductShippingAction({
        variantId: "variant_123",
        city: "Wollongong",
        postalCode: "2500",
        province: "NSW",
        countryCode: "au",
      })
    ).resolves.toMatchObject({
      success: true,
      options: [
        { id: "rat_economy", amount: 11.19, name: "Aramex Economy" },
        { id: "rat_priority", amount: 17.79, name: "Aramex Priority" },
      ],
    })

    expect(mockCalculate).not.toHaveBeenCalled()
    expect(mockGetLiveShippingRates).toHaveBeenCalledWith("cart_123", {
      city: "Wollongong",
      country_code: "au",
      postal_code: "2500",
      province: "NSW",
    })
  })

  it("returns display-dollar amounts for Medusa minor-unit shipping prices", async () => {
    mockGetShippingOptions.mockResolvedValue([
      {
        id: "ship_standard",
        name: "Karrio-Standard",
        description: "Economy",
        amount: 0,
        price_type: "calculated",
      },
      {
        id: "ship_express",
        name: "Karrio-Express",
        description: "Priority",
        amount: 0,
        price_type: "calculated",
      },
    ])
    mockCalculate
      .mockResolvedValueOnce({
        shipping_option: {
          calculated_price: { calculated_amount: 1119 },
        },
      })
      .mockResolvedValueOnce({
        shipping_option: {
          calculated_price: { calculated_amount: 1779 },
        },
      })

    await expect(
      estimateProductShippingAction({
        variantId: "variant_123",
        city: "Wollongong",
        postalCode: "2500",
        province: "NSW",
        countryCode: "au",
      })
    ).resolves.toMatchObject({
      success: true,
      options: [
        { id: "ship_standard", amount: 11.19, name: "Aramex Economy" },
        { id: "ship_express", amount: 17.79, name: "Aramex Priority" },
      ],
    })
    expect(mockCalculate).toHaveBeenNthCalledWith(1, "ship_standard", {
      cart_id: "cart_123",
      data: expect.objectContaining({
        name: "Karrio-Standard",
        code: "ship_standard",
      }),
    })
    expect(mockCalculate).toHaveBeenNthCalledWith(2, "ship_express", {
      cart_id: "cart_123",
      data: expect.objectContaining({
        name: "Karrio-Express",
        code: "ship_express",
      }),
    })
  })
})
