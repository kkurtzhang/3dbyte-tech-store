import orderPlacedHandler from "../order-placed";

const mockFetch = jest.fn();

global.fetch = mockFetch as unknown as typeof fetch;

const baseOrder = {
  created_at: "2026-05-05T08:00:00.000Z",
  currency_code: "aud",
  discount_total: 0,
  display_id: 1001,
  email: "test@demo.com",
  id: "order_123",
  item_total: 250.49,
  payment_status: "authorized",
  payment_collections: [
    {
      payments: [
        {
          provider_id: "pp_stripe_stripe",
          data: {
            payment_method: "pm_123",
            client_secret: "pi_secret_should_not_render",
          },
        },
      ],
    },
  ],
  subtotal: 250.49,
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
    first_name: "Ada",
    last_name: "Lovelace",
    address_1: "1 Test Street",
    city: "Hobart",
    province: "TAS",
    postal_code: "7000",
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
  shipping_methods: [{ name: "Australia Post Standard" }],
  shipping_total: 12,
  tax_total: 0,
  total: 262.49,
};

const createArgs = (order = baseOrder) => {
  const createNotifications = jest.fn().mockResolvedValue([{ id: "noti_123" }]);
  const resolve = jest.fn((key: string) => {
    if (key === "query") {
      return { graph };
    }
    if (key === "notification") {
      return { createNotifications };
    }
    throw new Error(`Unexpected dependency ${key}`);
  });
  const graph = jest
    .fn()
    .mockResolvedValueOnce({ data: [{ name: "3D Byte Tech" }] })
    .mockResolvedValueOnce({ data: [order] });

  return {
    args: {
      event: { data: { id: "order_123" } },
      container: {
        resolve,
      },
    },
    createNotifications,
    graph,
    resolve,
  };
};

describe("orderPlacedHandler", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = "development";
    process.env.ORDER_EMAILS_ENABLED = "true";
    process.env.STRIPE_SECRET_KEY = "sk_test_safe";
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "pm_123",
        type: "card",
        card: {
          brand: "visa",
          last4: "4242",
          exp_month: 5,
          exp_year: 2029,
        },
      }),
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("renders and sends an order confirmation notification", async () => {
    const { args, createNotifications, graph } = createArgs();

    await orderPlacedHandler(args as never);

    expect(graph).toHaveBeenCalledTimes(2);
    expect(graph).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        fields: expect.arrayContaining([
          "payment_status",
          "payment_collections.payments.provider_id",
          "payment_collections.payments.data",
          "items.metadata",
          "items.variant.preorder_variant.status",
          "items.variant.preorder_variant.available_date",
        ]),
      }),
    );
    expect(createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "email",
        content: expect.objectContaining({
          html: expect.stringContaining("Polymaker HT-PLA-GF"),
          subject: "Your 3D Byte Tech order #1001 is confirmed",
          text: expect.stringContaining("Payment method: Visa ending in 4242"),
        }),
        idempotency_key: "order-placed/order_123",
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
    expect(createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          text: expect.not.stringContaining("pi_secret_should_not_render"),
        }),
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

  it("skips without resolving notifications when order emails are disabled", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ORDER_EMAILS_ENABLED;

    const { args, createNotifications, graph, resolve } = createArgs();

    await orderPlacedHandler(args as never);

    expect(resolve).not.toHaveBeenCalledWith("notification");
    expect(graph).not.toHaveBeenCalled();
    expect(createNotifications).not.toHaveBeenCalled();
  });

  it("skips without resolving dependencies when order emails are allowed but no provider is configured", async () => {
    process.env.NODE_ENV = "development";
    process.env.ORDER_EMAILS_ENABLED = "true";
    process.env.MAILDEV_ENABLED = "false";

    const { args, createNotifications, graph, resolve } = createArgs();

    await orderPlacedHandler(args as never);

    expect(resolve).not.toHaveBeenCalledWith("query");
    expect(resolve).not.toHaveBeenCalledWith("notification");
    expect(graph).not.toHaveBeenCalled();
    expect(createNotifications).not.toHaveBeenCalled();
  });
});
