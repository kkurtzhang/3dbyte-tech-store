import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { consolidateGuestHistory } from "../../../../../modules/account-coordination/consolidate-guest-history";

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

  const consolidation = await consolidateGuestHistory({
    container: req.scope,
    customerId,
  });

  res.json({
    consolidation,
    linked: consolidation.transferred_order_ids.length,
  });
}
