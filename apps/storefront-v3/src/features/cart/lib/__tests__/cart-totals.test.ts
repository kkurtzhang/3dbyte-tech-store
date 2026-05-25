import {
  resolveCartItemsSubtotalInclTax,
  resolveCartShippingInclTax,
} from "../cart-totals"

describe("cart total display helpers", () => {
  it("uses Medusa item_total for tax-inclusive customer-facing cart subtotals", () => {
    expect(
      resolveCartItemsSubtotalInclTax(
        {
          item_subtotal: 17.2727272727,
          item_tax_total: 1.7272727273,
          item_total: 19,
          subtotal: 17.2727272727,
          tax_total: 1.7272727273,
          total: 19,
        },
        "aud"
      )
    ).toBe(19)
  })

  it("falls back to item subtotal plus item tax when item_total is not expanded", () => {
    expect(
      resolveCartItemsSubtotalInclTax(
        {
          item_subtotal: 17.2727272727,
          item_tax_total: 1.7272727273,
          subtotal: 17.2727272727,
          tax_total: 1.7272727273,
          total: 19,
        },
        "aud"
      )
    ).toBeCloseTo(19, 2)
  })

  it("removes selected shipping from the total when only order total is available", () => {
    expect(
      resolveCartItemsSubtotalInclTax(
        {
          total: 257.13,
          shipping_total: 13.52,
        },
        "aud"
      )
    ).toBeCloseTo(243.61, 2)
  })

  it("keeps non tax-inclusive currencies on Medusa item subtotal", () => {
    expect(
      resolveCartItemsSubtotalInclTax(
        {
          item_subtotal: 17.27,
          item_total: 19,
          subtotal: 17.27,
          total: 19,
        },
        "usd"
      )
    ).toBe(17.27)
  })

  it("uses the tax-inclusive shipping total when available", () => {
    expect(
      resolveCartShippingInclTax({
        shipping_subtotal: 12.29,
        shipping_tax_total: 1.23,
        shipping_total: 13.52,
      })
    ).toBe(13.52)
  })
})
