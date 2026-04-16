import { render, screen } from "@testing-library/react"
import type { MedusaCartLineItem } from "@/lib/medusa/cart"
import { CartNotices } from "../cart-notices"

function createLineItem(overrides: Partial<MedusaCartLineItem> = {}) {
  return {
    id: "line_default",
    title: "Default Item",
    quantity: 1,
    unit_price: 1000,
    metadata: null,
    variant: {
      id: "variant_default",
      title: "Default Variant",
      prices: [{ amount: 1200, currency_code: "usd" }],
      preorder_variant: undefined,
    },
    ...overrides,
  } as MedusaCartLineItem
}

describe("CartNotices", () => {
  it("renders nothing for regular-only carts", () => {
    const { container } = render(
      <CartNotices items={[createLineItem()]} currencyCode="usd" />
    )

    expect(container.firstChild).toBeNull()
  })

  it("shows preorder and mixed-cart notices when needed", () => {
    render(
      <CartNotices
        currencyCode="usd"
        items={[
          createLineItem(),
          createLineItem({
            id: "line_preorder",
            variant: {
              id: "variant_preorder",
              title: "Default Variant",
              prices: [{ amount: 1200, currency_code: "usd" }],
              preorder_variant: {
                status: "enabled",
                available_date: "2999-01-01T00:00:00.000Z",
                prices: [{ amount: 900, currency_code: "usd" }],
              },
            },
          }),
        ]}
      />
    )

    expect(screen.getByText(/Pre-order items ship when available/i)).toBeInTheDocument()
    expect(screen.getByText(/Jan 1, 2999/i)).toBeInTheDocument()
    expect(
      screen.getByText(/contains both in-stock and pre-order items/i)
    ).toBeInTheDocument()
  })

  it("shows the total bundle savings callout", () => {
    render(
      <CartNotices
        currencyCode="usd"
        items={[
          createLineItem({
            id: "line_bundle_1",
            unit_price: 900,
            metadata: {
              bundle_id: "bundle_123",
              bundle_title: "Starter Bundle",
              bundle_quantity: 1,
            },
            variant: {
              id: "variant_bundle_1",
              title: "Default Variant",
              prices: [{ amount: 1100, currency_code: "usd" }],
            },
          }),
          createLineItem({
            id: "line_bundle_2",
            unit_price: 600,
            metadata: {
              bundle_id: "bundle_123",
              bundle_title: "Starter Bundle",
              bundle_quantity: 1,
            },
            variant: {
              id: "variant_bundle_2",
              title: "Default Variant",
              prices: [{ amount: 700, currency_code: "usd" }],
            },
          }),
        ]}
      />
    )

    expect(screen.getByText(/Bundle savings applied/i)).toBeInTheDocument()
    expect(screen.getByText(/\$3\.00/)).toBeInTheDocument()
  })
})
