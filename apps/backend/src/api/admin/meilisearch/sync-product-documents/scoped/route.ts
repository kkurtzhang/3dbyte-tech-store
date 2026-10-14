import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";
import { documentKnowledgeDependencies } from "../../../../../lib/product-document-knowledge/lifecycle";
import { reconcileProductDocuments } from "../../../../../lib/product-document-knowledge/synchronize";

const inputSchema = z
  .object({
    document_ids: z
      .array(z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/))
      .min(1)
      .max(2)
      .refine((ids) => new Set(ids).size === ids.length),
  })
  .strict();

/** Inherits the existing /admin/meilisearch* user authentication and POST rate limit. */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  const input = inputSchema.safeParse(req.body);
  if (!input.success) {
    res
      .status(400)
      .json({ error: "One or two distinct document_ids are required." });
    return;
  }
  try {
    const result = await reconcileProductDocuments({
      ...documentKnowledgeDependencies(req.scope),
      documentIds: input.data.document_ids,
    });
    res.json({ document_ids: input.data.document_ids, ...result });
  } catch {
    res
      .status(503)
      .json({
        error: "Scoped product document synchronization is unavailable.",
      });
  }
}
