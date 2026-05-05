import orderPlacedHandler from "../order-placed";

const baseOrder = {
  created_at: "2026-05-05T08:00:00.000Z",
  currency_code: "aud",
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
  shipping_total: 1200,
  tax_total: 0,
  total: 26249,
};

const createArgs = (order = baseOrder) => {
  const createNotifications = jest.fn().mockResolvedValue([{ id: "noti_123" }]);
  const graph = jest
    .fn()
    .mockResolvedValueOnce({ data: [{ name: "3D Byte Tech" }] })
    .mockResolvedValueOnce({ data: [order] });

  return {
    args: {
      event: { data: { id: "order_123" } },
      container: {
        resolve: jest.fn((key: string) => {
          if (key === "query") {
            return { graph };
          }
          if (key === "notification") {
            return { createNotifications };
          }
          throw new Error(`Unexpected dependency ${key}`);
        }),
      },
    },
    createNotifications,
    graph,
  };
};

describe("orderPlacedHandler", () => {
  it("renders and sends an order confirmation notification", async () => {
    const { args, createNotifications, graph } = createArgs();

    await orderPlacedHandler(args as never);

    expect(graph).toHaveBeenCalledTimes(2);
    expect(createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "email",
        content: expect.objectContaining({
          html: expect.stringContaining("Polymaker HT-PLA-GF"),
          subject: "Order Confirmation - 3D Byte Tech #1001",
          text: expect.stringContaining("Total: A$262.49"),
        }),
        data: expect.objectContaining({
          email_metadata: {
            entity_id: "order_123",
            event: "order.placed",
            idempotency_key: "order-placed/order_123",
          },
        }),
        template: "order-placed",
        to: "test@demo.com",
      }),
    );
  });

  it("skips notifications when the order has no email", async () => {
    const { args, createNotifications } = createArgs({
      ...baseOrder,
      email: null,
    });

    await orderPlacedHandler(args as never);

    expect(createNotifications).not.toHaveBeenCalled();
  });
});
