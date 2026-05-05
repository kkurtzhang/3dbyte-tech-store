import { renderOrderPlacedEmail } from "../renderers/order-placed";

const order = {
  created_at: "2026-05-05T08:00:00.000Z",
  currency_code: "aud",
  discount_total: 0,
  display_id: 1001,
  email: "test@demo.com",
  id: "order_123",
  item_total: 25049,
  items: [
    {
      id: "item_123",
      product_title: "Polymaker HT-PLA-GF",
      quantity: 1,
      unit_price: 25049,
      variant_title: "Black",
    },
  ],
  shipping_address: {
    first_name: "Ada",
    last_name: "Lovelace",
    address_1: "1 Test Street",
    city: "Hobart",
    province: "TAS",
    postal_code: "7000",
    country_code: "au",
  },
  shipping_total: 1200,
  tax_total: 0,
  total: 26249,
};

describe("renderOrderPlacedEmail", () => {
  it("renders provider-neutral subject, html, and text", async () => {
    const rendered = await renderOrderPlacedEmail({
      order,
      store: { name: "3D Byte Tech" },
    });

    expect(rendered.subject).toBe("Order Confirmation - 3D Byte Tech #1001");
    expect(rendered.html).toContain("Polymaker HT-PLA-GF");
    expect(rendered.html).toContain("A$250.49");
    expect(rendered.html).toContain("Hobart TAS 7000");
    expect(rendered.text).toContain("Order #1001");
    expect(rendered.text).toContain("Total: A$262.49");
  });
});
