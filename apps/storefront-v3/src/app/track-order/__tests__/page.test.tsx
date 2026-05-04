import { render, screen } from "@testing-library/react"

import { OrderDetails } from "../page"
import type { MedusaOrder } from "@/lib/medusa/types"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock("@/app/actions/track-order", () => ({
  lookupOrder: jest.fn(),
}))

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

jest.mock("lucide-react", () => ({
  AlertCircle: () => <span />,
  ArrowRight: () => <span />,
  CheckCircle: () => <span />,
  CheckCircle2: () => <span />,
  CreditCard: () => <span />,
  MapPin: () => <span />,
  Package: () => <span />,
  Truck: () => <span />,
}))

const order = {
  id: "order_01KQJV8S9GVN1A1YBW2XENDK65",
  status: "pending",
  payment_status: "authorized",
  currency_code: "aud",
  created_at: "2026-05-03T00:00:00.000Z",
  item_subtotal: 19,
  subtotal: 31.05,
  shipping_subtotal: 12.05,
  shipping_total: 13.255,
  tax_total: 3.105,
  total: 34.155,
  items: [
    {
      id: "item_1",
      title: "Polymaker HT-PLA-GF",
      quantity: 1,
      unit_price: 19,
      subtotal: 19,
      total: 19,
      thumbnail: null,
      variant_title: "Power Tool Green",
      metadata: {
        regular_unit_price: 25,
      },
      variant: {
        id: "variant_1",
        title: "Default Variant",
        preorder_variant: {
          status: "enabled",
          available_date: "2999-01-01T00:00:00.000Z",
          prices: [{ amount: 19, currency_code: "aud" }],
        },
      },
    },
    {
      id: "item_2",
      title: "Bundle Filament",
      quantity: 1,
      unit_price: 6,
      subtotal: 6,
      total: 6,
      metadata: {
        bundle_id: "bundle_1",
        bundle_title: "Printer Starter Bundle",
      },
      variant: {
        id: "variant_2",
        title: "Default Variant",
      },
    },
    {
      id: "item_3",
      title: "Bundle Tool",
      quantity: 1,
      unit_price: 6,
      subtotal: 6,
      total: 6,
      metadata: {
        bundle_id: "bundle_1",
        bundle_title: "Printer Starter Bundle",
      },
      variant: {
        id: "variant_3",
        title: "Default Variant",
      },
    },
  ],
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
  shipping_address: {
    first_name: "Ada",
    last_name: "Lovelace",
    address_1: "99 Manual Road",
    city: "Hobart",
    province: "TAS",
    postal_code: "7000",
    country_code: "au",
  },
} as MedusaOrder

describe("Track order page order details", () => {
  it("formats order prices as major units", () => {
    render(<OrderDetails order={order} />)

    expect(screen.getAllByText("A$19.00").length).toBeGreaterThan(0)
    expect(screen.getByText("A$12.05")).toBeInTheDocument()
    expect(screen.getByText("A$3.11")).toBeInTheDocument()
    expect(screen.getByText("A$34.16")).toBeInTheDocument()
    expect(screen.queryByText("A$0.34")).not.toBeInTheDocument()
  })

  it("reuses the order-confirmed summary for items, bundles, and preorder pricing", () => {
    render(<OrderDetails order={order} />)

    expect(screen.getByText("Items")).toBeInTheDocument()
    expect(screen.queryByText("Items Ordered")).not.toBeInTheDocument()
    expect(screen.getByText("Power Tool Green")).toBeInTheDocument()
    expect(screen.getByText("Printer Starter Bundle")).toBeInTheDocument()
    expect(
      screen.getByText(/Some items in this order are pre-ordered/i)
    ).toBeInTheDocument()
    expect(screen.getByText("A$25.00")).toHaveClass("line-through")
  })

  it("shows safe payment card details without exposing raw Stripe identifiers", () => {
    render(<OrderDetails order={order} />)

    expect(screen.getByText("Visa ending in 4242")).toBeInTheDocument()
    expect(screen.queryByText(/pi_should_not_render/i)).not.toBeInTheDocument()
  })

  it("uses the verified tracking payment method when Stripe card details are not embedded in the order", () => {
    render(
      <OrderDetails
        order={{
          ...order,
          tracking_payment_method: {
            type: "card",
            brand: "visa",
            last4: "4242",
          },
          payment_collections: [
            {
              id: "pay_col_1",
              payments: [
                {
                  id: "pay_1",
                  provider_id: "pp_stripe_stripe",
                  data: {
                    payment_method: "pm_should_not_render",
                  },
                },
              ],
            },
          ],
        } as MedusaOrder}
      />
    )

    expect(screen.getByText("Visa ending in 4242")).toBeInTheDocument()
    expect(screen.queryByText(/pm_should_not_render/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Authorized$/i)).not.toBeInTheDocument()
  })

  it("shows the shipping address only once", () => {
    render(<OrderDetails order={order} />)

    expect(screen.getAllByText("Shipping Address")).toHaveLength(1)
  })

  it("shows split fulfillment progress for mixed regular and preorder orders", () => {
    render(<OrderDetails order={order} />)

    expect(screen.getAllByText("Awaiting split fulfillment").length).toBeGreaterThan(0)
    expect(screen.getByText("Ready-to-ship items")).toBeInTheDocument()
    expect(screen.getByText("Ready for fulfillment")).toBeInTheDocument()
    expect(screen.getByText("Pre-order items")).toBeInTheDocument()
    expect(screen.getByText("Waiting for release")).toBeInTheDocument()
    expect(screen.getByText(/They may ship separately/i)).toBeInTheDocument()
  })

  it("shows partially shipped while preorder items still wait for release", () => {
    render(
      <OrderDetails
        order={{
          ...order,
          fulfillment_status: "partially_shipped",
        } as MedusaOrder}
      />
    )

    expect(screen.getAllByText("Partially shipped").length).toBeGreaterThan(0)
    expect(screen.getByText("Shipped")).toBeInTheDocument()
    expect(screen.getByText("Waiting for release")).toBeInTheDocument()
  })

  it("shows regular processing when the order has no preorder items", () => {
    render(
      <OrderDetails
        order={{
          ...order,
          items: [
            {
              id: "item_regular",
              title: "Regular Product",
              quantity: 1,
              unit_price: 19,
              subtotal: 19,
              total: 19,
              variant: {
                id: "variant_regular",
                title: "Default Variant",
              },
            },
          ],
        } as MedusaOrder}
      />
    )

    expect(screen.getAllByText("Processing").length).toBeGreaterThan(0)
    expect(screen.queryByText("Waiting for release")).not.toBeInTheDocument()
    expect(screen.queryByText("Ready-to-ship items")).not.toBeInTheDocument()
  })
})
