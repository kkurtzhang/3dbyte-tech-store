import type { MedusaOrder } from "@/lib/medusa/types"
import { getOrderLifecycle } from "../order-lifecycle"

const preorderVariant = {
  id: "pre_1",
  status: "enabled",
  available_date: "2999-01-01T00:00:00.000Z",
  prices: [{ amount: 19, currency_code: "aud" }],
} as const

function makeOrder(overrides: Partial<MedusaOrder> = {}): MedusaOrder {
  return {
    id: "order_1",
    status: "pending",
    payment_status: "authorized",
    fulfillment_status: "not_fulfilled",
    currency_code: "aud",
    created_at: "2026-05-03T00:00:00.000Z",
    items: [
      {
        id: "item_ready",
        title: "Ready Product",
        quantity: 1,
        variant: {
          id: "variant_ready",
          title: "Default",
        },
      },
      {
        id: "item_preorder",
        title: "Pre-order Product",
        quantity: 2,
        variant: {
          id: "variant_preorder",
          title: "Default",
          preorder_variant: preorderVariant,
        },
      },
    ],
    ...overrides,
  } as MedusaOrder
}

describe("order lifecycle", () => {
  it("describes mixed regular and preorder orders as split fulfillment", () => {
    const lifecycle = getOrderLifecycle(makeOrder())

    expect(lifecycle.label).toBe("Awaiting split fulfillment")
    expect(lifecycle.description).toMatch(/ship separately/i)
    expect(lifecycle.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "ready",
          title: "Ready-to-ship items",
          status: "Ready for fulfillment",
          itemCount: 1,
        }),
        expect.objectContaining({
          id: "preorder",
          title: "Pre-order items",
          status: "Waiting for release",
          itemCount: 2,
        }),
      ])
    )
  })

  it("keeps preorder items waiting when regular items are partially shipped", () => {
    const lifecycle = getOrderLifecycle(
      makeOrder({ fulfillment_status: "partially_shipped" })
    )

    expect(lifecycle.label).toBe("Partially shipped")
    expect(lifecycle.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "ready",
          status: "Shipped",
        }),
        expect.objectContaining({
          id: "preorder",
          status: "Waiting for release",
        }),
      ])
    )
  })

  it("uses preorder-only status when every item is a preorder", () => {
    const lifecycle = getOrderLifecycle(
      makeOrder({
        items: [
          {
            id: "item_preorder",
            title: "Pre-order Product",
            quantity: 1,
            variant: {
              id: "variant_preorder",
              title: "Default",
              preorder_variant: preorderVariant,
            },
          },
        ],
      })
    )

    expect(lifecycle.label).toBe("Awaiting pre-order release")
    expect(lifecycle.groups).toHaveLength(1)
  })

  it("falls back to processing for regular unfulfilled orders", () => {
    const lifecycle = getOrderLifecycle(
      makeOrder({
        items: [
          {
            id: "item_ready",
            title: "Ready Product",
            quantity: 1,
            variant: {
              id: "variant_ready",
              title: "Default",
            },
          },
        ],
      })
    )

    expect(lifecycle.label).toBe("Processing")
    expect(lifecycle.groups).toHaveLength(0)
  })
})
