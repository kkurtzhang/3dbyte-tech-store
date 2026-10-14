import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";
import { authorizeInternalAiRequest } from "../_utils";
import { documentKnowledgeDependencies } from "../../../lib/product-document-knowledge/lifecycle";
import { retrieveProductKnowledge } from "../../../lib/product-document-knowledge/retrieve";

const identifier = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const searchInput = z
  .object({
    query: z.string().trim().min(1).max(120),
    product_id: identifier.optional(),
    variant_id: identifier.optional(),
    limit: z.number().int().min(1).max(4).optional(),
  })
  .strict();

/** Existing internal AI auth and rate limiting apply; no caller-controlled URLs. */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  if (!authorizeInternalAiRequest(req, res)) return;
  const input = searchInput.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: "Invalid knowledge search." });
    return;
  }
  try {
    res.json(
      await retrieveProductKnowledge({
        ...documentKnowledgeDependencies(req.scope),
        queryText: input.data.query,
        productId: input.data.product_id,
        variantId: input.data.variant_id,
        limit: input.data.limit,
      }),
    );
  } catch {
    res
      .status(503)
      .json({ error: "Knowledge evidence is temporarily unavailable." });
  }
}
