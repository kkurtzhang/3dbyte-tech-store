import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import {
  isKnowledgeRecord,
  knowledgeIdentifier,
} from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
export async function rejectReferenceOffers(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: () => void,
) {
  const body: unknown = req.body;
  if (!isKnowledgeRecord(body)) return next();
  const items = [
    body,
    ...(Array.isArray(body.items) ? body.items : []),
    ...(Array.isArray(body.add) ? body.add : []),
  ];
  if (items.length > 101)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Too many cart items.",
    );
  const ids = [
    ...new Set(
      items
        .filter(isKnowledgeRecord)
        .map((item) => item.variant_id)
        .filter(knowledgeIdentifier),
    ),
  ];
  if (!ids.length) return next();
  const query = req.scope.resolve("query");
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product.metadata"],
    filters: { id: ids },
  });
  if (
    (data ?? []).some(
      (item) =>
        isKnowledgeRecord(item) &&
        isKnowledgeRecord(item.product) &&
        isKnowledgeRecord(item.product.metadata) &&
        item.product.metadata.catalogue_role === "knowledge_reference",
    )
  )
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Reference products have no activated staging checkout offer.",
    );
  next();
}
