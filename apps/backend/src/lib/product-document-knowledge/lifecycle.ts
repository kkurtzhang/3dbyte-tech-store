import type { MedusaContainer } from "@medusajs/framework/types";
import { knowledgeIdentifier } from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
import type MeilisearchModuleService from "../../modules/meilisearch/service";
import type StrapiModuleService from "../../modules/strapi/service";
import { MEILISEARCH_MODULE } from "../../modules/meilisearch";
import { STRAPI_MODULE } from "../../modules/strapi";
import { reconcileProductDocuments } from "./synchronize";

export function documentKnowledgeDependencies(container: MedusaContainer) {
  return {
    query: container.resolve("query"),
    strapi: container.resolve<StrapiModuleService>(STRAPI_MODULE),
    meilisearch:
      container.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE),
  };
}

/** Webhooks are wake-ups only: always read the current published CMS state. */
export async function handleProductDocumentWebhook(
  container: MedusaContainer,
  event: string,
  documentId: unknown,
) {
  if (
    process.env.PRODUCT_DOCUMENT_SYNC_ENABLED !== "true" ||
    ![
      "entry.publish",
      "entry.unpublish",
      "entry.delete",
      "entry.update",
    ].includes(event)
  )
    return { skipped: true };
  if (!knowledgeIdentifier(documentId))
    throw new Error("Invalid document identity.");
  return reconcileProductDocuments({
    ...documentKnowledgeDependencies(container),
    documentId: documentId as string,
  });
}
