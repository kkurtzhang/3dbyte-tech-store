import type { MedusaNextFunction } from "@medusajs/framework/http";

import { createOrderAccessToken } from "../token";
import { requireStoreOrderAccess } from "../middleware";

const secret = "test-order-access-secret-that-is-at-least-32-bytes";

const createResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe("store order access middleware", () => {
  beforeEach(() => {
    process.env.ORDER_ACCESS_TOKEN_SECRET = secret;
  });

  afterEach(() => {
    delete process.env.ORDER_ACCESS_TOKEN_SECRET;
  });

  it("accepts a short-lived proof scoped to the requested order", async () => {
    const token = createOrderAccessToken({ orderId: "order_123", secret });
    const req = {
      params: { id: "order_123" },
      headers: { "x-order-access-token": token },
      scope: { resolve: jest.fn() },
    };
    const res = createResponse();
    const next = jest.fn() as MedusaNextFunction;

    await requireStoreOrderAccess(req as never, res as never, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.scope.resolve).not.toHaveBeenCalled();
  });

  it("accepts an authenticated customer only for an order they own", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [{ id: "order_123", customer_id: "cus_123" }],
    });
    const req = {
      params: { id: "order_123" },
      headers: {},
      auth_context: { actor_id: "cus_123" },
      scope: { resolve: jest.fn().mockReturnValue({ graph }) },
    };
    const res = createResponse();
    const next = jest.fn() as MedusaNextFunction;

    await requireStoreOrderAccess(req as never, res as never, next);

    expect(graph).toHaveBeenCalledWith({
      entity: "order",
      fields: ["id", "customer_id"],
      filters: { id: "order_123" },
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns the same not-found response for invalid proof and wrong ownership", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [{ id: "order_123", customer_id: "cus_owner" }],
    });
    const req = {
      params: { id: "order_123" },
      headers: { "x-order-access-token": "invalid" },
      auth_context: { actor_id: "cus_other" },
      scope: { resolve: jest.fn().mockReturnValue({ graph }) },
    };
    const res = createResponse();
    const next = jest.fn() as MedusaNextFunction;

    await requireStoreOrderAccess(req as never, res as never, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Order not found" });
  });
});
