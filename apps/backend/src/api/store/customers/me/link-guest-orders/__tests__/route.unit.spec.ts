import { Modules } from "@medusajs/framework/utils";

import { POST } from "../route";

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("POST /store/customers/me/link-guest-orders", () => {
  it("links same-email guest orders to the authenticated customer", async () => {
    const customerModule = {
      retrieveCustomer: jest.fn().mockResolvedValue({
        id: "cus_123",
        email: "Ava@Example.COM",
      }),
    };
    const orderModule = {
      updateOrders: jest.fn().mockResolvedValue([{ id: "order_guest" }]),
    };
    const query = {
      graph: jest.fn().mockResolvedValue({
        data: [
          {
            id: "order_guest",
            email: "ava@example.com",
            customer_id: null,
          },
          {
            id: "order_existing",
            email: "ava@example.com",
            customer_id: "cus_123",
          },
        ],
      }),
    };
    const req = {
      auth_context: { actor_id: "cus_123" },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === Modules.CUSTOMER) return customerModule;
          if (key === Modules.ORDER) return orderModule;
          if (key === "query") return query;
          throw new Error(`Unexpected module ${key}`);
        }),
      },
    };
    const res = createResponse();

    await POST(req as never, res as never);

    expect(query.graph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "order",
        filters: { email: "ava@example.com" },
      }),
    );
    expect(orderModule.updateOrders).toHaveBeenCalledWith([
      {
        id: "order_guest",
        customer_id: "cus_123",
      },
    ]);
    expect(res.json).toHaveBeenCalledWith({ linked: 1 });
  });
});
