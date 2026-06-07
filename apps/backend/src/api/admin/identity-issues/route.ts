import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";

import {
  listAdminIdentityIssues,
  type AdminIdentityIssueFilters,
} from "./identity-issues";

export const GetAdminIdentityIssuesSchema = z.object({
  issue_type: z.string().trim().min(1).max(100).optional(),
  status: z.string().trim().min(1).max(50).optional(),
  provider: z.string().trim().min(1).max(50).optional(),
  email: z.string().trim().max(320).optional(),
  date_from: z.string().datetime({ offset: true }).optional(),
  date_to: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

type IdentityIssuesRequest = MedusaRequest & {
  validatedQuery: AdminIdentityIssueFilters;
};

export async function GET(
  req: IdentityIssuesRequest,
  res: MedusaResponse,
): Promise<void> {
  const result = await listAdminIdentityIssues({
    container: req.scope,
    filters: req.validatedQuery,
  });

  res.json({
    identity_issues: result.issues,
    count: result.count,
    limit: result.limit,
    offset: result.offset,
  });
}
