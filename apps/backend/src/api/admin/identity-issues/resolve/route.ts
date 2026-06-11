import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";

import { resolveAdminIdentityIssue } from "../resolve-identity-issue";

export const PostAdminResolveIdentityIssueSchema = z.object({
  issue_id: z
    .string()
    .trim()
    .regex(/^[a-z_]+:[a-f0-9]{16}$/)
    .max(100),
});

type ResolveIdentityIssueRequest = MedusaRequest & {
  auth_context?: { actor_id?: string };
  validatedBody: z.infer<typeof PostAdminResolveIdentityIssueSchema>;
};

export async function POST(
  req: ResolveIdentityIssueRequest,
  res: MedusaResponse,
): Promise<void> {
  const adminId = req.auth_context?.actor_id;
  if (!adminId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const resolution = await resolveAdminIdentityIssue({
      adminId,
      container: req.scope,
      issueId: req.validatedBody.issue_id,
    });
    res.json({ resolution });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Identity issue repair failed";
    const status =
      message === "Identity issue no longer exists"
        ? 404
        : message.includes("requires CUSTOMER_ACCOUNT_CONSOLIDATION_MODE=live")
          ? 409
          : message.includes("active customer") ||
              message.includes("another actor")
            ? 409
            : 500;

    if (status === 500) {
      console.error("Admin identity issue repair failed", {
        admin_id: adminId,
        issue_id: req.validatedBody.issue_id,
        error: message,
      });
    }
    res.status(status).json({
      message:
        status === 500 ? "Identity issue repair failed" : message,
    });
  }
}

