import { renderOrderPlacedEmail } from "../renderers/order-placed";

const order = {
  created_at: "2026-05-05T08:00:00.000Z",
  currency_code: "aud",
  discount_total: 0,
  display_id: 1001,
  email: "test@demo.com",
  id: "order_123",
  item_total: 250.49,
  items: [
    {
      id: "item_123",
      product_title: "Polymaker HT-PLA-GF",
      quantity: 1,
      total: 250.49,
      variant_title: "Black",
    },
  ],
  billing_address: {
    first_name: "Grace",
    last_name: "Hopper",
    address_1: "9 Invoice Road",
    city: "Sydney",
    province: "NSW",
    postal_code: "2000",
    country_code: "au",
  },
  shipping_address: {
    first_name: "Ada",
    last_name: "Lovelace",
    address_1: "1 Test Street",
    city: "Hobart",
    province: "TAS",
    postal_code: "7000",
    country_code: "au",
  },
  shipping_methods: [
    {
      name: "Australia Post Standard",
    },
  ],
  shipping_total: 12,
  subtotal: 250.49,
  tax_total: 0,
  total: 262.49,
};

describe("renderOrderPlacedEmail", () => {
  it("renders provider-neutral subject, html, and text", async () => {
    const rendered = await renderOrderPlacedEmail({
      order,
      store: { name: "3D Byte Tech" },
    });

    expect(rendered.subject).toBe("Your 3D Byte Tech order #1001 is confirmed");
    expect(rendered.html).toContain("Polymaker HT-PLA-GF");
    expect(rendered.html).toContain("A$250.49");
    expect(rendered.html).not.toContain("A$NaN");
    expect(rendered.html).toContain("Hobart TAS 7000");
    expect(rendered.html).toContain("Sydney NSW 2000");
    expect(rendered.html).toContain("Australia Post Standard");
    expect(rendered.text).toContain("Order #1001");
    expect(rendered.text).toContain("Total: A$262.49");
  });

  it("renders discounted order totals from pre-discount subtotal through final total", async () => {
    const rendered = await renderOrderPlacedEmail({
      order: {
        ...order,
        discount_total: 20,
        item_total: 230.49,
        subtotal: 250.49,
        total: 242.49,
      },
      store: { name: "3D Byte Tech" },
    });

    expect(rendered.html).toContain("Subtotal");
    expect(rendered.html).toContain("A$250.49");
    expect(rendered.html).toContain("Discount");
    expect(rendered.html).toContain("-A$20.00");
    expect(rendered.text).toContain("Subtotal: A$250.49");
    expect(rendered.text).toContain("Discount: -A$20.00");
    expect(rendered.text).toContain("Shipping: A$12.00");
    expect(rendered.text).toContain("Tax: A$0.00");
    expect(rendered.text).toContain("Total: A$242.49");
  });

  it("uses customer-facing display id and falls back to line totals when unit price is absent", async () => {
    const rendered = await renderOrderPlacedEmail({
      order: {
        ...order,
        custom_display_id: "3DB-1777978800123",
        display_id: 5,
        id: "order_01KQP_TEST",
        items: [
          {
            id: "item_without_unit_price",
            product_title: "LDO Colony Clacker Door Kit",
            quantity: 2,
            total: 40,
            variant_title: "Black",
          },
        ],
      },
      store: { name: "Medusa Store" },
    });

    expect(rendered.subject).toBe(
      "Your 3D Byte Tech order 3DB-1777978800123 is confirmed",
    );
    expect(rendered.text).toContain("Order 3DB-1777978800123");
    expect(rendered.html).toContain("A$40.00");
    expect(rendered.html).not.toContain("order_01KQP_TEST");
    expect(rendered.html).not.toContain("A$NaN");
  });

  it("renders Medusa raw amount and detail quantity fields from order query payloads", async () => {
    const rendered = await renderOrderPlacedEmail({
      order: {
        ...order,
        custom_display_id: "3DB-1777976810295",
        item_subtotal: undefined,
        item_total: undefined,
        shipping_subtotal: undefined,
        shipping_total: undefined,
        subtotal: undefined,
        tax_total: undefined,
        total: undefined,
        raw_item_subtotal: { value: "19" },
        raw_shipping_subtotal: { value: "11.87" },
        raw_tax_total: { value: "3.09" },
        raw_total: { value: "33.96" },
        items: [
          {
            id: "item_raw_payload",
            product_title: "Polymaker™ High Temp HT-PLA-GF 1kg 1.75mm Filament",
            quantity: undefined,
            detail: {
              quantity: 1,
            },
            raw_total: { value: "19" },
            variant_sku: "3DB-POL-PA18008",
            variant_title: "Power Tool Green",
          },
        ],
      },
      store: { name: "3D Byte Tech" },
    });

    expect(rendered.text).toContain(
      "1 x Polymaker™ High Temp HT-PLA-GF 1kg 1.75mm Filament",
    );
    expect(rendered.html).toContain("A$19.00");
    expect(rendered.text).toContain("Subtotal: A$19.00");
    expect(rendered.html).toContain("Shipping");
    expect(rendered.html).toContain("A$11.87");
    expect(rendered.html).toContain("A$3.09");
    expect(rendered.html).toContain("A$33.96");
    expect(rendered.html).not.toContain("Qty </");
    expect(rendered.text).toContain(
      "1 x Polymaker™ High Temp HT-PLA-GF 1kg 1.75mm Filament (Power Tool Green) - A$19.00",
    );
    expect(rendered.text).toContain("Total: A$33.96");
  });

  it("renders Medusa BigNumber-like totals, unit prices, and quantities", async () => {
    const rendered = await renderOrderPlacedEmail({
      order: {
        ...order,
        custom_display_id: "3DB-1777976810295",
        item_subtotal: { numeric: 19, valueOf: () => 19 },
        shipping_subtotal: { numeric: 11.87, valueOf: () => 11.87 },
        tax_total: { numeric: 3.09, valueOf: () => 3.09 },
        total: { numeric: 33.96, valueOf: () => 33.96 },
        items: [
          {
            id: "item_bignumber_payload",
            product_title: "Polymaker HT-PLA-GF",
            quantity: { numeric: 1, valueOf: () => 1 },
            subtotal: { numeric: 19, valueOf: () => 19 },
            unit_price: { numeric: 19, valueOf: () => 19 },
            variant_title: "Power Tool Green",
          },
        ],
      },
      store: { name: "3D Byte Tech" },
    });

    expect(rendered.text).toContain(
      "1 x Polymaker HT-PLA-GF (Power Tool Green) - A$19.00",
    );
    expect(rendered.text).toContain("Unit: A$19.00");
    expect(rendered.text).toContain("Subtotal: A$19.00");
    expect(rendered.text).toContain("Shipping: A$11.87");
    expect(rendered.text).toContain("Tax: A$3.09");
    expect(rendered.text).toContain("Total: A$33.96");
  });

  it("labels preorder release dates, groups bundled items, and links to order tracking", async () => {
    const rendered = await renderOrderPlacedEmail({
      order: {
        ...order,
        custom_display_id: "3DB-1777976810999",
        items: [
          {
            id: "bundle_child_1",
            metadata: {
              bundle_id: "bundle_1",
              bundle_title: "Printer Starter Bundle",
              bundle_quantity: 1,
            },
            product_title: "Nozzle Kit",
            quantity: 1,
            subtotal: 35,
            unit_price: 35,
            variant_title: "0.4mm",
          },
          {
            id: "preorder_item",
            product_title: "Polymaker HT-PLA-GF",
            quantity: 1,
            subtotal: 19,
            unit_price: 19,
            variant: {
              preorder_variant: {
                available_date: "2026-05-09T00:00:00.000Z",
                status: "enabled",
              },
            },
            variant_title: "Power Tool Green",
          },
          {
            id: "bundle_child_2",
            metadata: {
              bundle_id: "bundle_1",
              bundle_title: "Printer Starter Bundle",
              bundle_quantity: 1,
            },
            product_title: "Build Plate",
            quantity: 1,
            subtotal: 45,
            unit_price: 45,
          },
        ],
      },
      store: { name: "3D Byte Tech" },
    });

    expect(rendered.html).toContain("Printer Starter Bundle");
    expect(rendered.text).toContain("Bundle: Printer Starter Bundle");
    expect(rendered.text).toContain("Releases on 9 May 2026");
    expect(rendered.html).toContain(
      "https://store.3dbytetech.com.au/track-order?reference=3DB-1777976810999",
    );
    expect(rendered.text).toContain(
      "Track your order: https://store.3dbytetech.com.au/track-order?reference=3DB-1777976810999",
    );
  });
});
