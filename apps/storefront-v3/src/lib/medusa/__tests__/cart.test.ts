import { completePreorderCart, getCart, initiatePaymentSession } from "../cart"
import { sdk } from "../client"

jest.mock("../client", () => ({
  sdk: {
    store: {
      cart: {
        create: jest.fn(),
        retrieve: jest.fn(),
        createLineItem: jest.fn(),
      },
      payment: {
        initiatePaymentSession: jest.fn(),
      },
    },
    client: {
      fetch: jest.fn(),
    },
  },
}))

describe("medusa cart helpers", () => {
  it("requests checkout, preorder, and sale pricing data when retrieving carts", async () => {
    ;(sdk.store.cart.retrieve as jest.Mock).mockResolvedValue({
      cart: { id: "cart_1" },
    })

    await getCart("cart_1")

    expect(sdk.store.cart.retrieve).toHaveBeenCalledWith("cart_1", {
      fields: expect.stringContaining("*items.variant.preorder_variant.prices"),
    })
    expect(sdk.store.cart.retrieve).toHaveBeenCalledWith("cart_1", {
      fields: expect.stringContaining("+items.variant.calculated_price"),
    })
    expect(sdk.store.cart.retrieve).toHaveBeenCalledWith("cart_1", {
      fields: expect.stringContaining("+items.variant.prices"),
    })
    expect(sdk.store.cart.retrieve).toHaveBeenCalledWith("cart_1", {
      fields: expect.stringContaining("+shipping_address"),
    })
    expect(sdk.store.cart.retrieve).toHaveBeenCalledWith("cart_1", {
      fields: expect.stringContaining("+shipping_subtotal"),
    })
  })

  it("creates carts with the selected Medusa region", async () => {
    const { createCart } = await import("../cart")
    ;(sdk.store.cart.create as jest.Mock).mockResolvedValue({
      cart: { id: "cart_1", region_id: "reg_au" },
    })

    await expect(createCart("reg_au")).resolves.toEqual({
      id: "cart_1",
      region_id: "reg_au",
    })

    expect(sdk.store.cart.create).toHaveBeenCalledWith({
      region_id: "reg_au",
    })
  })

  it("uses the priced line-item route when adding items to cart and rehydrates the cart", async () => {
    const { addToCart } = await import("../cart")
    ;(sdk.client.fetch as jest.Mock).mockResolvedValue({
      cart: { id: "cart_1" },
    })
    ;(sdk.store.cart.retrieve as jest.Mock).mockResolvedValue({
      cart: { id: "cart_1", total: 57 },
    })

    await expect(
      addToCart({
        cartId: "cart_1",
        variantId: "variant_1",
        quantity: 2,
      }),
    ).resolves.toEqual({ id: "cart_1", total: 57 })

    expect(sdk.client.fetch).toHaveBeenCalledWith(
      "/store/carts/cart_1/line-items-priced",
      {
        method: "POST",
        body: {
          variant_id: "variant_1",
          quantity: 2,
        },
      },
    )
    expect(sdk.store.cart.retrieve).toHaveBeenCalledWith("cart_1", {
      fields: expect.stringContaining("+items.variant.calculated_price"),
    })
  })

  it("uses the preorder completion route", async () => {
    ;(sdk.client.fetch as jest.Mock).mockResolvedValue({
      order: { id: "order_1" },
    })

    await expect(completePreorderCart("cart_1")).resolves.toEqual({
      id: "order_1",
    })

    expect(sdk.client.fetch).toHaveBeenCalledWith(
      "/store/carts/cart_1/complete-preorder",
      {
        method: "POST",
      },
    )
  })

  it("uses the preorder completion order id fallback", async () => {
    ;(sdk.client.fetch as jest.Mock).mockResolvedValue({ order_id: "order_1" })

    await expect(completePreorderCart("cart_1")).resolves.toEqual({
      id: "order_1",
    })

    expect(sdk.client.fetch).toHaveBeenCalledWith(
      "/store/carts/cart_1/complete-preorder",
      {
        method: "POST",
      },
    )
  })

  it("passes provider data when initiating a payment session", async () => {
    ;(sdk.store.payment.initiatePaymentSession as jest.Mock).mockResolvedValue({
      payment_collection: { id: "pay_col_1" },
    })

    await expect(
      initiatePaymentSession({
        cart: { id: "cart_1" } as never,
        data: { payment_method_types: ["card"] },
        providerId: "pp_stripe_stripe",
      }),
    ).resolves.toEqual({ payment_collection: { id: "pay_col_1" } })

    expect(sdk.store.payment.initiatePaymentSession).toHaveBeenCalledWith(
      { id: "cart_1" },
      {
        data: { payment_method_types: ["card"] },
        provider_id: "pp_stripe_stripe",
      },
    )
  })
})
