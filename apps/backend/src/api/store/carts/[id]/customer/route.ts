import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

type CustomerRecord = {
  email?: string | null;
  id: string;
};

const getCustomerId = (req: MedusaRequest): string | undefined =>
  (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id;

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const customerId = getCustomerId(req);
  const cartId = req.params.id;

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (!cartId) {
    res.status(400).json({ message: "Cart id is required" });
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

  const cartModule = req.scope.resolve<{
    updateCarts: (input: {
      customer_id: string;
      email: string;
      id: string;
    }) => Promise<unknown>;
  }>(Modules.CART);
  const cart = await cartModule.updateCarts({
    id: cartId,
    customer_id: customer.id,
    email: customer.email,
  });

  res.json({ cart });
}
