import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

type CustomerRecord = {
  id: string;
  email?: string | null;
};

type OrderRecord = {
  customer_id?: string | null;
  email?: string | null;
  id: string;
};

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const getCustomerId = (req: MedusaRequest): string | undefined =>
  (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id;

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const customerId = getCustomerId(req);

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const customerModule = req.scope.resolve<{
    retrieveCustomer: (id: string) => Promise<CustomerRecord>;
  }>(Modules.CUSTOMER);
  const customer = await customerModule.retrieveCustomer(customerId);

  if (!customer?.email) {
    res.status(400).json({ message: "Customer email is required" });
    return;
  }

  const email = normalizeEmail(customer.email);
  const query = req.scope.resolve<{
    graph: (input: Record<string, unknown>) => Promise<{ data: OrderRecord[] }>;
  }>("query");
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "email", "customer_id"],
    filters: { email },
  });
  const guestOrderUpdates = orders
    .filter((order) => !order.customer_id && normalizeEmail(order.email || "") === email)
    .map((order) => ({
      id: order.id,
      customer_id: customer.id,
    }));

  if (guestOrderUpdates.length > 0) {
    const orderModule = req.scope.resolve<{
      updateOrders: (input: Array<{ id: string; customer_id: string }>) => Promise<unknown>;
    }>(Modules.ORDER);

    await orderModule.updateOrders(guestOrderUpdates);
  }

  res.json({ linked: guestOrderUpdates.length });
}
