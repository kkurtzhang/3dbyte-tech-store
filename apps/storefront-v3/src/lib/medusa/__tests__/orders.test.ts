import { getOrder } from "../orders"
import { sdk } from "../client"

jest.mock("../client", () => ({
  sdk: {
    store: {
      order: {
        retrieve: jest.fn(),
      },
    },
  },
}))

describe("medusa order helpers", () => {
  it("requests preorder variant data when retrieving orders", async () => {
    ;(sdk.store.order.retrieve as jest.Mock).mockResolvedValue({ order: { id: "order_1" } })

    await getOrder("order_1")

    expect(sdk.store.order.retrieve).toHaveBeenCalledWith("order_1", {
      fields: "*payment_collections.payments,*items,*items.metadata,*items.variant,*items.product,*items.variant.preorder_variant",
    })
  })
})
