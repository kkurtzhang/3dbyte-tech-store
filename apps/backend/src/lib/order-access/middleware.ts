import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import { verifyOrderAccessToken } from "./token";

type OrderOwner = {
  id: string;
  customer_id?: string | null;
};

const getHeader = (req: MedusaRequest, name: string): string | undefined => {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

const orderAccessMiddleware = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
): Promise<void> => {
  const orderId = req.params.id;
  const proof = getHeader(req, "x-order-access-token");
  const secret = process.env.ORDER_ACCESS_TOKEN_SECRET?.trim() || "";

  if (verifyOrderAccessToken({ token: proof, orderId, secret })) {
    next();
    return;
  }

  const customerId = (
    req as MedusaRequest & { auth_context?: { actor_id?: string } }
  ).auth_context?.actor_id;
  if (customerId) {
    try {
      const query = req.scope.resolve("query");
      const { data } = await query.graph({
        entity: "order",
        fields: ["id", "customer_id"],
        filters: { id: orderId },
      });
      const order = data?.[0] as OrderOwner | undefined;

      if (order?.customer_id === customerId) {
        next();
        return;
      }
    } catch {
      // Keep authorization failures indistinguishable from unknown order IDs.
    }
  }

  res.status(404).json({ message: "Order not found" });
};

export const requireStoreOrderAccess = Object.assign(orderAccessMiddleware, {
  orderAccessMiddleware: true,
});
