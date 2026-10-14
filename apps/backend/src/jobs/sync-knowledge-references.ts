import type { MedusaContainer } from "@medusajs/framework/types";
import { MEILISEARCH_MODULE } from "../modules/meilisearch";
import { STRAPI_MODULE } from "../modules/strapi";
import { trackReconciliation } from "../lib/product-document-knowledge/recovery";
import { reconcileReferenceIndex } from "../lib/knowledge-reference/reference-index";

/** Opt-in scope owned by one staging index; poll expiry/publication as well as revisions. */
export default async function syncKnowledgeReferences(
  container: MedusaContainer,
) {
  if (
    process.env.APP_ENV !== "staging" ||
    process.env.KNOWLEDGE_REFERENCE_INDEX_ENABLED !== "true"
  )
    return;
  const productIds = (process.env.KNOWLEDGE_REFERENCE_PRODUCT_IDS ?? "")
    .split(",")
    .map((id) => id.trim());
  await trackReconciliation(
    "sync-knowledge-references",
    container.resolve("logger"),
    () =>
      reconcileReferenceIndex({
        query: container.resolve("query"),
        strapi: container.resolve(STRAPI_MODULE),
        meilisearch: container.resolve(MEILISEARCH_MODULE),
        environment: process.env.APP_ENV,
        productIds,
      }),
  );
}
export const config = {
  name: "sync-knowledge-references",
  schedule: "*/5 * * * *",
};
