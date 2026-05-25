import { render, screen } from "@testing-library/react"
import { OrderSummary } from "../order-summary"
import type { MedusaOrder } from "@/lib/medusa/types"

jest.mock("lucide-react", () => ({
  CheckCircle2: () => <span />,
}))

jest.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}))

const createOrder = (overrides: Partial<MedusaOrder> = {}): MedusaOrder =>
  ({
    id: "order_1",
    custom_display_id: "3DB-1777976810295",
    display_id: 9,
    status: "completed",
    currency_code: "usd",
    created_at: "2025-01-01T00:00:00.000Z",
    item_subtotal: 8,
    subtotal: 8,
    total: 8,
    items: [
      {
        id: "item_1",
        title: "Test Product",
        quantity: 1,
        unit_price: 8,
        subtotal: 8,
        metadata: {
          regular_unit_price: 10,
        },
        variant: {
          id: "variant_1",
          title: "Default Variant",
          preorder_variant: {
            status: "enabled",
            available_date: "2999-01-01T00:00:00.000Z",
            prices: [{ amount: 8, currency_code: "usd" }],
          },
        },
      },
    ],
    ...overrides,
  }) as MedusaOrder

describe("OrderSummary", () => {
  it("shows the customer-facing order number and billing address", () => {
    render(
      <OrderSummary
        order={createOrder({
          billing_address: {
            first_name: "Grace",
            last_name: "Hopper",
            address_1: "40 Crown Street",
            city: "Riverstone",
            province: "NSW",
            postal_code: "2765",
            country_code: "au",
          },
          shipping_address: {
            first_name: "Ada",
            last_name: "Lovelace",
            address_1: "12 Houtman Avenue",
            city: "Shell Cove",
            province: "NSW",
            postal_code: "2529",
            country_code: "au",
          },
        } as Partial<MedusaOrder>)}
      />
    )

    expect(screen.getByText("Order Number")).toBeInTheDocument()
    expect(screen.getByText("3DB-1777976810295")).toBeInTheDocument()
    expect(screen.queryByText("order_1")).not.toBeInTheDocument()
    expect(screen.getByText("Billing Address")).toBeInTheDocument()
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument()
    expect(screen.getByText("40 Crown Street")).toBeInTheDocument()
    expect(screen.getAllByText("Australia")).toHaveLength(2)
  })

  it("falls back to Medusa display id when custom display id is absent", () => {
    render(
      <OrderSummary
        order={createOrder({
          custom_display_id: null,
          display_id: 9,
        } as Partial<MedusaOrder>)}
      />
    )

    expect(screen.getByText("#9")).toBeInTheDocument()
  })

  it("shows preorder availability messaging", () => {
    render(<OrderSummary order={createOrder()} />)

    expect(screen.getByText(/Pre-order available on/i)).toBeInTheDocument()
    expect(screen.getByText("Qty 1 x $8.00")).toBeInTheDocument()
    expect(screen.getByText("$10.00")).toHaveClass("line-through")
    expect(screen.queryByText(/Pre-order price:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Regular price:/i)).not.toBeInTheDocument()
  })

  it("shows line totals as the primary item price and unit pricing as secondary text", () => {
    render(
      <OrderSummary
        order={createOrder({
          items: [
            {
              id: "item_1",
              title: "Polymaker HT-PLA-GF",
              quantity: 2,
              unit_price: 19,
              subtotal: 38,
              total: 38,
              metadata: {
                regular_unit_price: 25.815,
              },
              variant_title: "Power Tool Green",
              variant: {
                id: "variant_1",
                title: "Default Variant",
                preorder_variant: {
                  status: "enabled",
                  available_date: "2999-01-01T00:00:00.000Z",
                  prices: [{ amount: 19, currency_code: "usd" }],
                },
              },
            },
          ],
        })}
      />
    )

    expect(screen.getByText("$38.00")).toBeInTheDocument()
    expect(screen.getByText("Qty 2 x $19.00")).toBeInTheDocument()
    expect(screen.getByText("$51.63")).toHaveClass("line-through")
  })

  it("shows major-unit order totals without dividing by 100", () => {
    render(
      <OrderSummary
        order={createOrder({
          item_subtotal: 19,
          subtotal: 31.05,
          shipping_subtotal: 12.05,
          shipping_total: 13.255,
          tax_total: 3.105,
          total: 34.155,
        } as Partial<MedusaOrder>)}
      />
    )

    expect(screen.getByText("Subtotal")).toBeInTheDocument()
    expect(screen.getByText("$20.90")).toBeInTheDocument()
    expect(screen.getByText("Shipping")).toBeInTheDocument()
    expect(screen.getByText("$13.26")).toBeInTheDocument()
    expect(screen.queryByText("$12.05")).not.toBeInTheDocument()
    expect(screen.queryByText("Includes GST")).not.toBeInTheDocument()
    expect(screen.getByText("(Includes GST: $3.11)")).toBeInTheDocument()
    expect(screen.getByText("$34.16")).toBeInTheDocument()
    expect(screen.getByText("Total (USD)")).toBeInTheDocument()
    expect(screen.queryByText("Tax")).not.toBeInTheDocument()
    expect(screen.queryByText("$0.34")).not.toBeInTheDocument()
  })

  it("formats country names and does not render a stray zero when tax is zero", () => {
    render(
      <OrderSummary
        order={createOrder({
          shipping_address: {
            first_name: "Ada",
            last_name: "Lovelace",
            address_1: "99 Manual Road",
            city: "Hobart",
            province: "TAS",
            postal_code: "7000",
            country_code: "au",
          },
          tax_total: 0,
        } as Partial<MedusaOrder>)}
      />
    )

    expect(screen.getByText("Australia")).toBeInTheDocument()
    expect(screen.queryByText("au")).not.toBeInTheDocument()
    expect(screen.queryByText("0")).not.toBeInTheDocument()
  })

  it("groups bundled items as a single purchased line with variant-aware includes", () => {
    render(
      <OrderSummary
        order={createOrder({
          items: [
            {
              id: "item_1",
              title: "Bundle Part 1",
              quantity: 1,
              unit_price: 10,
              subtotal: 10,
              total: 10,
              metadata: {
                bundle_id: "bundle_1",
                bundle_title: "Starter Bundle",
                bundle_quantity: 1,
                regular_unit_price: 12,
              },
              variant: {
                id: "variant_1",
                title: "Blue",
                preorder_variant: {
                  status: "enabled",
                  available_date: "2999-01-01T00:00:00.000Z",
                  prices: [{ amount: 8, currency_code: "usd" }],
                },
              },
            },
            {
              id: "item_2",
              title: "Bundle Part 2",
              quantity: 1,
              unit_price: 5,
              subtotal: 5,
              total: 5,
              metadata: {
                bundle_id: "bundle_1",
                bundle_title: "Starter Bundle",
                bundle_quantity: 1,
              },
              variant: {
                id: "variant_2",
                title: "Default Variant",
              },
            },
          ],
        })}
      />
    )

    expect(screen.getByText("Starter Bundle")).toBeInTheDocument()
    expect(screen.getByText("$15.00")).toBeInTheDocument()
    expect(screen.getByText("Qty 1 x $15.00")).toBeInTheDocument()
    expect(screen.getByText("1 x Bundle Part 1 - Blue")).toBeInTheDocument()
    expect(screen.getByText("1 x Bundle Part 2")).toBeInTheDocument()
    expect(
      screen.getByText(/Some items in this order are pre-ordered/i)
    ).toBeInTheDocument()
  })

  it("collapses repeated billing address when it is the same as shipping", () => {
    const sameAddress = {
      first_name: "Ada",
      last_name: "Lovelace",
      address_1: "12 Houtman Avenue",
      city: "Shell Cove",
      province: "NSW",
      postal_code: "2529",
      country_code: "au",
    }

    render(
      <OrderSummary
        order={createOrder({
          billing_address: sameAddress,
          shipping_address: sameAddress,
        } as Partial<MedusaOrder>)}
      />
    )

    expect(screen.getByText("Shipping Address")).toBeInTheDocument()
    expect(screen.getByText("Billing Address")).toBeInTheDocument()
    expect(screen.getByText("Same as shipping address")).toBeInTheDocument()
    expect(screen.getAllByText("Ada Lovelace")).toHaveLength(1)
  })

  it("shows safe payment method details when card data is available", () => {
    render(
      <OrderSummary
        order={createOrder({
          payment_status: "authorized",
          payment_collections: [
            {
              id: "pay_col_1",
              payments: [
                {
                  id: "pay_1",
                  provider_id: "stripe",
                  data: {
                    payment_intent: "pi_should_not_render",
                    payment_method_details: {
                      card: {
                        brand: "visa",
                        last4: "4242",
                      },
                    },
                  },
                },
              ],
            },
          ],
        } as Partial<MedusaOrder>)}
      />
    )

    expect(screen.getByText("Payment: Visa ending in 4242")).toBeInTheDocument()
    expect(screen.queryByText(/pi_should_not_render/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Payment: authorized/i)).not.toBeInTheDocument()
  })

  it("shows line-item variant titles when nested variant titles are default", () => {
    render(
      <OrderSummary
        order={createOrder({
          items: [
            {
              id: "item_1",
              title: "Polymaker HT-PLA-GF",
              quantity: 1,
              unit_price: 19,
              variant_title: "Power Tool Green",
              subtitle: "Power Tool Green",
              variant: {
                id: "variant_1",
                title: "Default Variant",
              },
            },
          ],
        })}
      />
    )

    expect(screen.getByText("Power Tool Green")).toBeInTheDocument()
    expect(screen.queryByText(/Default Variant/i)).not.toBeInTheDocument()
  })
})
