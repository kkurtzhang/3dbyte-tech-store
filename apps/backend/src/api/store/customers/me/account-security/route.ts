import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { buildAccountSecuritySummary } from "../../../../../modules/account-coordination/account-security-summary";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const customerId = (
    req as MedusaRequest & { auth_context?: { actor_id?: string } }
  ).auth_context?.actor_id;

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const accountSecurity = await buildAccountSecuritySummary({
    container: req.scope,
    customerId,
  });

  res.json({ account_security: accountSecurity });
}
