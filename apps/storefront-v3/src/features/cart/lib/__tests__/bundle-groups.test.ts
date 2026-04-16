import { buildCartDisplayGroups, getCartDisplayItemCount } from "../bundle-groups"
import type { MedusaCartLineItem } from "@/lib/medusa/cart"

function createLineItem(overrides: Partial<MedusaCartLineItem> = {}) {
  return {
    id: "line_default",
    title: "Default Item",
    quantity: 1,
    unit_price: 10,
    metadata: null,
    ...overrides,
  } as MedusaCartLineItem
}

describe("bundle-groups", () => {
  it("groups bundle line items and preserves regular items", () => {
    const groups = buildCartDisplayGroups([
      createLineItem({
        id: "line_regular",
        title: "Regular Item",
      }),
      createLineItem({
        id: "line_bundle_1",
        title: "Bundle Child 1",
        metadata: {
          bundle_id: "bundle_123",
          bundle_title: "Starter Bundle",
          bundle_product_handle: "starter-bundle",
          bundle_quantity: 2,
        },
      }),
      createLineItem({
        id: "line_bundle_2",
        title: "Bundle Child 2",
        metadata: {
          bundle_id: "bundle_123",
          bundle_title: "Starter Bundle",
          bundle_product_handle: "starter-bundle",
          bundle_quantity: 2,
        },
      }),
    ])

    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({
      type: "item",
      item: {
        id: "line_regular",
      },
    })
    expect(groups[1]).toMatchObject({
      type: "bundle",
      bundleId: "bundle_123",
      bundleTitle: "Starter Bundle",
      bundleProductHandle: "starter-bundle",
      quantity: 2,
    })
    expect(groups[1].type === "bundle" ? groups[1].items : []).toHaveLength(2)
  })

  it("counts a bundle by bundle quantity instead of child line count", () => {
    const groups = buildCartDisplayGroups([
      createLineItem({
        id: "line_bundle_1",
        metadata: {
          bundle_id: "bundle_123",
          bundle_quantity: 3,
        },
      }),
      createLineItem({
        id: "line_bundle_2",
        metadata: {
          bundle_id: "bundle_123",
          bundle_quantity: 3,
        },
      }),
      createLineItem({
        id: "line_regular",
        quantity: 2,
      }),
    ])

    expect(getCartDisplayItemCount(groups)).toBe(5)
  })

  it("uses the stable bundle key and derives quantity from per-bundle item quantity when needed", () => {
    const groups = buildCartDisplayGroups([
      createLineItem({
        id: "line_bundle_1",
        quantity: 2,
        metadata: {
          bundle_id: "bundle_123",
          bundle_key: "bundle_123:item_1:variant_1|item_2:variant_2",
          bundle_item_id: "item_1",
          bundle_item_quantity: 1,
          bundle_title: "Starter Bundle",
        },
      }),
      createLineItem({
        id: "line_bundle_2",
        quantity: 4,
        metadata: {
          bundle_id: "bundle_123",
          bundle_key: "bundle_123:item_1:variant_1|item_2:variant_2",
          bundle_item_id: "item_2",
          bundle_item_quantity: 2,
          bundle_title: "Starter Bundle",
        },
      }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({
      type: "bundle",
      bundleId: "bundle_123:item_1:variant_1|item_2:variant_2",
      quantity: 2,
    })
  })
})
