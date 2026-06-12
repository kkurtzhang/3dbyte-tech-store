import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

import { consolidateGuestHistory } from "../../../../../modules/account-coordination/consolidate-guest-history";

const getCustomerId = (req: MedusaRequest): string | undefined =>
  (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id;

type CustomerForGuestLinking = {
  id: string;
  email?: string | null;
  metadata?: Record<string, unknown> | null;
};

const isEmailVerified = (customer: CustomerForGuestLinking): boolean => {
  const metadata = customer.metadata;

  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  return (
    metadata.email_verification_status === "verified" ||
    typeof metadata.email_verified_at === "string"
  );
};

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
    retrieveCustomer: (
      id: string,
      config?: Record<string, unknown>,
    ) => Promise<CustomerForGuestLinking>;
  }>(Modules.CUSTOMER);
  const customer = await customerModule.retrieveCustomer(customerId, {
    select: ["id", "email", "metadata"],
  });

  if (!isEmailVerified(customer)) {
    res.status(409).json({
      code: "email_not_verified",
      message:
        "Email verification is required before linking guest order history.",
    });
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
