import type { ApprovedKnowledgeDocument } from "@3dbyte-tech-store/shared-types";
import { knowledgeIdentifier } from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
import { PRODUCT_DOCUMENT_INDEX_SETTINGS } from "../../modules/meilisearch/service";
import { toPublicProductDocumentSearchDocument } from "../../modules/product-files/utils/public-documents";
import { verifiedReferenceDocument } from "../knowledge-reference/contract";
import {
  knowledgeForPublishedProduct,
  knowledgeMatchesMetadata,
  readKnowledgeProducts,
  type KnowledgeDependencies,
} from "./contract";

export const PUBLIC_KNOWLEDGE_INDEX_SETTINGS = {
  ...PRODUCT_DOCUMENT_INDEX_SETTINGS,
  searchableAttributes: [
    ...(PRODUCT_DOCUMENT_INDEX_SETTINGS.searchableAttributes ?? []),
    "knowledge_text",
  ],
  filterableAttributes: [
    ...(PRODUCT_DOCUMENT_INDEX_SETTINGS.filterableAttributes ?? []),
    "knowledge_variant_id",
    "knowledge_binding_scope",
    "knowledge_revision_hash",
  ],
  displayedAttributes: [
    ...(PRODUCT_DOCUMENT_INDEX_SETTINGS.displayedAttributes ?? []),
    "knowledge_variant_id",
    "knowledge_revision_hash",
    "knowledge_valid_until",
    "knowledge_binding_scope",
  ],
};

/** Offset pages can omit a live ID even when counts and uniqueness stay stable. */
async function confirmWithdrawals(
  options: KnowledgeDependencies & { documentId?: string },
  currentIds: Set<string>,
) {
  const existing = options.documentId
    ? [options.documentId]
    : await options.meilisearch.listDocumentIds("product_document");
  if (
    !Array.isArray(existing) ||
    existing.length > 20_000 ||
    existing.some((id) => !knowledgeIdentifier(id)) ||
    new Set(existing).size !== existing.length
  )
    throw new Error("Invalid indexed document identity snapshot.");
  const missing = existing.filter((id) => !currentIds.has(id));
  if (missing.length > 2000)
    throw new Error(
      "Document withdrawal verification exceeds its bounded scope.",
    );
  // A scoped sync already performed this exact authoritative read above.
  if (!options.documentId) {
    for (let offset = 0; offset < missing.length; offset += 4) {
      await Promise.all(
        missing.slice(offset, offset + 4).map(async (documentId) => {
          const current = await options.strapi.listProductDocuments(undefined, {
            includeKnowledge: true,
            documentId,
          });
          if (!Array.isArray(current) || current.length !== 0)
            throw new Error(
              "CMS document snapshot changed; retry reconciliation.",
            );
        }),
      );
    }
  }
  return missing;
}

/** Rebuild a derived projection only; never writes CMS/Medusa records or approvals. */
export async function reconcileProductDocuments(
  options: KnowledgeDependencies & { documentId?: string },
) {
  if (
    options.documentId !== undefined &&
    !knowledgeIdentifier(options.documentId)
  )
    throw new Error("Invalid document synchronization scope.");
  const documents = await options.strapi.listProductDocuments(undefined, {
    includeKnowledge: true,
    ...(options.documentId ? { documentId: options.documentId } : {}),
  });
  if (!Array.isArray(documents) || documents.length > 2000)
    throw new Error("Oversized document synchronization snapshot.");
  const ids = new Set<string>();
  const approved = new Map<string, ApprovedKnowledgeDocument>();
  for (const metadata of documents) {
    if (
      !knowledgeIdentifier(metadata.id) ||
      ids.has(metadata.id) ||
      (options.documentId && metadata.id !== options.documentId)
    )
      throw new Error("Invalid document synchronization snapshot.");
    ids.add(metadata.id);
    const doc = verifiedReferenceDocument(
      metadata.approved_knowledge,
      options.now,
    );
    if (doc && knowledgeMatchesMetadata(doc, metadata))
      approved.set(metadata.id, doc);
  }
  const stale = await confirmWithdrawals(options, ids);
  const products = await readKnowledgeProducts(
    options.query,
    [...approved.values()].map((d) => d.product_id),
  );
  let knowledgeIndexed = 0;
  const records = documents.map((metadata) => {
    const body = approved.get(metadata.id);
    const doc = knowledgeForPublishedProduct(
      body,
      body ? products.get(body.product_id) : undefined,
      options.now,
    );
    if (doc) knowledgeIndexed++;
    return {
      ...toPublicProductDocumentSearchDocument(metadata),
      ...(doc
        ? {
            knowledge_binding_scope: doc.binding_scope ?? "variant",
            knowledge_variant_id: doc.variant_id,
            knowledge_revision_hash: doc.revision_hash,
            knowledge_valid_until: doc.valid_until,
            knowledge_text: doc.text,
          }
        : {}),
    };
  });
  // All source reads and completeness checks finish before any search mutation.
  await options.meilisearch.configureIndex(
    PUBLIC_KNOWLEDGE_INDEX_SETTINGS,
    "product_document",
  );
  if (records.length)
    await options.meilisearch.indexData(records, "product_document");
  if (stale.length)
    await options.meilisearch.deleteFromIndex(stale, "product_document");
  return {
    indexed: records.length,
    deleted: stale.length,
    knowledge_indexed: knowledgeIndexed,
  };
}
