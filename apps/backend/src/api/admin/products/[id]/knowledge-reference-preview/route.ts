import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  knowledgeIdentifier,
  knowledgeDigest,
} from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
import {
  STRAPI_MODULE,
  type StrapiModuleService,
} from "../../../../../modules/strapi";
import { bindKnowledgeReference } from "../../../../../lib/knowledge-reference/contract";

/** Protected read-only intake preview; never mutates a shell or approves a source. */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  if (process.env.APP_ENV !== "staging") {
    res
      .status(404)
      .json({ error: "Reference intake is available in staging." });
    return;
  }
  const { document_id: documentId, revision } = req.query;
  if (
    !knowledgeIdentifier(req.params.id) ||
    !knowledgeIdentifier(documentId) ||
    !knowledgeDigest(revision) ||
    Object.keys(req.query).some(
      (key) => !["document_id", "revision"].includes(key),
    )
  ) {
    res
      .status(400)
      .json({ error: "An exact product, document and revision are required." });
    return;
  }
  const query = req.scope.resolve("query"),
    strapi = req.scope.resolve<StrapiModuleService>(STRAPI_MODULE);
  try {
    const { data } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "handle",
        "status",
        "metadata",
        "variants.id",
        "variants.price_set.prices.amount",
      ],
      filters: { id: req.params.id },
      pagination: { take: 2 },
    });
    const doc = await strapi.getKnowledgeReference(
      documentId,
      req.params.id,
      revision,
    );
    if (data?.length !== 1 || !doc) {
      res.status(409).json({
        error: "A unique shell and current approved document are required.",
      });
      return;
    }
    const metadata = bindKnowledgeReference(data[0], doc, process.env.APP_ENV);
    res.json({
      applied: false,
      product_id: req.params.id,
      document_id: documentId,
      revision_hash: revision,
      native_update: { id: req.params.id, status: "draft", metadata },
      prices: [],
      checkout_enabled: false,
    });
  } catch {
    res.status(409).json({
      error:
        "Reference binding is unavailable or conflicts with the current shell.",
    });
  }
}
