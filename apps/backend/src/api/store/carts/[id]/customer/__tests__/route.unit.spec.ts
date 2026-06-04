import { Modules } from "@medusajs/framework/utils";

import { POST } from "../route";

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("POST /store/carts/:id/customer", () => {
  it("attaches the authenticated customer to the current cart", async () => {
    const customerModule = {
      retrieveCustomer: jest.fn().mockResolvedValue({
        id: "cus_123",
        email: "ava@example.com",
      }),
    };
    const cartModule = {
      updateCarts: jest.fn().mockResolvedValue({ id: "cart_123" }),
    };
    const req = {
      auth_context: { actor_id: "cus_123" },
      params: { id: "cart_123" },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === Modules.CUSTOMER) return customerModule;
          if (key === Modules.CART) return cartModule;
          throw new Error(`Unexpected module ${key}`);
        }),
      },
    };
    const res = createResponse();

    await POST(req as never, res as never);

    expect(cartModule.updateCarts).toHaveBeenCalledWith({
      id: "cart_123",
      customer_id: "cus_123",
      email: "ava@example.com",
    });
    expect(res.json).toHaveBeenCalledWith({
      cart: { id: "cart_123" },
    });
  });
});
