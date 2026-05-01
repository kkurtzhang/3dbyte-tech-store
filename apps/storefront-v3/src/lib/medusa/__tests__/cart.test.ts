import { completePreorderCart, getCart } from "../cart"
import { sdk } from "../client"

jest.mock("../client", () => ({
  sdk: {
    store: {
      cart: {
        retrieve: jest.fn(),
        createLineItem: jest.fn(),
      },
    },
    client: {
      fetch: jest.fn(),
    },
  },
}))

describe("medusa cart helpers", () => {
  it("requests checkout, preorder, and sale pricing data when retrieving carts", async () => {
    ;(sdk.store.cart.retrieve as jest.Mock).mockResolvedValue({ cart: { id: "cart_1" } })

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
  })

  it("uses the priced line-item route when adding items to cart and rehydrates the cart", async () => {
    const { addToCart } = await import("../cart")
    ;(sdk.client.fetch as jest.Mock).mockResolvedValue({ cart: { id: "cart_1" } })
    ;(sdk.store.cart.retrieve as jest.Mock).mockResolvedValue({ cart: { id: "cart_1", total: 57 } })

    await expect(
      addToCart({
        cartId: "cart_1",
        variantId: "variant_1",
        quantity: 2,
      })
    ).resolves.toEqual({ id: "cart_1", total: 57 })

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/carts/cart_1/line-items-priced", {
      method: "POST",
      body: {
        variant_id: "variant_1",
        quantity: 2,
      },
    })
    expect(sdk.store.cart.retrieve).toHaveBeenCalledWith("cart_1", {
      fields: expect.stringContaining("+items.variant.calculated_price"),
    })
  })

  it("uses the preorder completion route", async () => {
    ;(sdk.client.fetch as jest.Mock).mockResolvedValue({ order: { id: "order_1" } })

    await expect(completePreorderCart("cart_1")).resolves.toEqual({ id: "order_1" })

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/carts/cart_1/complete-preorder", {
      method: "POST",
    })
  })
})
