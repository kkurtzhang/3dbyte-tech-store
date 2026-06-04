import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { removeCustomerAccountWorkflow } from "@medusajs/medusa/core-flows";

const getCustomerId = (req: MedusaRequest): string | undefined =>
  (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id;

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const customerId = getCustomerId(req);

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  await removeCustomerAccountWorkflow(req.scope).run({
    input: {
      customerId,
    },
  });

  res.json({ success: true });
}
