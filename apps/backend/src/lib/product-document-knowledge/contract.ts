import type {
  ApprovedKnowledgeDocument,
  MeilisearchIndexSettings,
  MeilisearchIndexType,
} from "@3dbyte-tech-store/shared-types";
import {
  isKnowledgeRecord,
  knowledgeIdentifier,
} from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
import type { PublicProductDocument } from "../../modules/product-files/utils/public-documents";
import { verifiedReferenceDocument } from "../knowledge-reference/contract";

export type KnowledgeProductDocument = PublicProductDocument & {
  approved_knowledge?: unknown;
};
export type DocumentReadOptions = {
  includeKnowledge?: boolean;
  documentId?: string;
};
export interface KnowledgeDependencies {
  strapi: {
    listProductDocuments(
      productId?: string,
      options?: DocumentReadOptions,
    ): Promise<KnowledgeProductDocument[]>;
    getKnowledgeReference(
      documentId: string,
      productId: string,
      revision: string,
    ): Promise<ApprovedKnowledgeDocument | null>;
  };
  query: {
    graph(
      input: Record<string, unknown>,
    ): Promise<{ data: unknown[]; metadata?: { count?: number } }>;
  };
  meilisearch: {
    getIndexSettings?(
      type: MeilisearchIndexType,
    ): Promise<MeilisearchIndexSettings>;
    configureIndex(
      settings: MeilisearchIndexSettings,
      type: MeilisearchIndexType,
    ): Promise<unknown>;
    indexData(
      documents: Record<string, unknown>[],
      type: MeilisearchIndexType,
    ): Promise<unknown>;
    listDocumentIds(type: MeilisearchIndexType): Promise<string[]>;
    deleteFromIndex(
      ids: string[],
      type: MeilisearchIndexType,
    ): Promise<unknown>;
    search(
      term: string,
      type: MeilisearchIndexType,
      options: Record<string, unknown>,
    ): Promise<{ hits: unknown[] }>;
  };
  now?: number;
}

/** Bounded complete graph snapshots; source failures never authorize cleanup. */
export async function readKnowledgeProducts(
  query: KnowledgeDependencies["query"],
  ids: string[],
) {
  const unique = [...new Set(ids)];
  if (unique.length > 2000 || unique.some((id) => !knowledgeIdentifier(id)))
    throw new Error("Invalid knowledge product scope.");
  const products = new Map<string, Record<string, unknown>>();
  for (let offset = 0; offset < unique.length; offset += 100) {
    const scope = unique.slice(offset, offset + 100);
    const result = await query.graph({
      entity: "product",
      fields: ["id", "title", "handle", "status", "variants.id"],
      filters: { id: scope, status: "published" },
      pagination: { take: 100, skip: 0, order: { id: "ASC" } },
    });
    if (
      !Array.isArray(result.data) ||
      result.metadata?.count !== result.data.length ||
      result.data.length > scope.length
    )
      throw new Error("Incomplete knowledge product snapshot.");
    for (const product of result.data) {
      if (
        !isKnowledgeRecord(product) ||
        typeof product.id !== "string" ||
        !scope.includes(product.id) ||
        products.has(product.id)
      )
        throw new Error("Invalid knowledge product snapshot.");
      products.set(product.id, product);
    }
  }
  return products;
}

/** Ordinary published products may have prices and multiple variants/documents. */
export function knowledgeForPublishedProduct(
  raw: unknown,
  product: unknown,
  now = Date.now(),
) {
  const document = verifiedReferenceDocument(raw, now);
  if (
    !document ||
    !isKnowledgeRecord(product) ||
    product.status !== "published" ||
    product.id !== document.product_id ||
    product.title !== document.product_title ||
    product.handle !== document.product_handle ||
    (document.binding_scope !== "product" &&
      (!Array.isArray(product.variants) ||
        product.variants.filter(
          (v) => isKnowledgeRecord(v) && v.id === document.variant_id,
        ).length !== 1))
  )
    return null;
  return document;
}

export function knowledgeMatchesMetadata(
  document: ApprovedKnowledgeDocument,
  metadata: PublicProductDocument,
) {
  return (
    document.document_id === metadata.id &&
    document.product_id === metadata.medusa_product_id &&
    document.product_handle === metadata.product_handle &&
    document.product_title === metadata.product_title &&
    document.document_title === metadata.title &&
    document.source_url === metadata.source_url &&
    document.source_kind === metadata.source_kind &&
    document.source_version === metadata.version &&
    document.source_checked_at === metadata.source_checked_at
  );
}
