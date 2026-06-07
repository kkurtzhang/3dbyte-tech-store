import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { buildAccountSecuritySummary } from "../../../../../modules/account-coordination/account-security-summary";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const customerId = req.params.id;

  if (!customerId) {
    res.status(400).json({ message: "Customer id is required" });
    return;
  }

  const accountSecurity = await buildAccountSecuritySummary({
    container: req.scope,
    customerId,
  });

  res.json({ account_security: accountSecurity });
}
