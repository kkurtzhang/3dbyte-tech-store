import type {
  ApprovedKnowledgeDocument,
  KnowledgeReferenceCard,
  MeilisearchIndexSettings,
} from "@3dbyte-tech-store/shared-types";
import {
  isKnowledgeRecord,
  knowledgeDigest,
  knowledgeIdentifier,
} from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
import type MeilisearchModuleService from "../../modules/meilisearch/service";
import { referenceBinding, referenceCard } from "./contract";

export interface ReferenceGraph {
  graph(input: {
    entity: string;
    fields: string[];
    filters: { status: string; id: string[] };
    pagination?: { take: number; skip: number; order: { id: "ASC" } };
  }): Promise<{ data: unknown[]; metadata?: { count?: number } }>;
}
type Dependencies = {
  query: ReferenceGraph;
  strapi: {
    getKnowledgeReference(
      document: string,
      product: string,
      revision: string,
    ): Promise<ApprovedKnowledgeDocument | null>;
  };
  meilisearch: Pick<
    MeilisearchModuleService,
    | "configureIndex"
    | "indexData"
    | "listDocumentIds"
    | "deleteFromIndex"
    | "search"
  >;
  environment: string | undefined;
  now?: number;
};
const fields = [
  "id",
  "title",
  "handle",
  "status",
  "metadata",
  "variants.id",
  "variants.price_set.prices.amount",
];
export const REFERENCE_INDEX_SETTINGS: MeilisearchIndexSettings = {
  searchableAttributes: [
    "product_title",
    "document_title",
    "text",
    "facts.label",
    "facts.value",
  ],
  displayedAttributes: [
    "id",
    "product_id",
    "variant_id",
    "document_id",
    "revision_hash",
  ],
  filterableAttributes: [],
  sortableAttributes: [],
  pagination: { maxTotalHits: 5000 },
};

/** Explicit scope, dedicated derived index, no approval or source-store writes. */
export async function reconcileReferenceIndex(
  options: Dependencies & { productIds: string[] },
) {
  const { productIds, query, strapi, meilisearch, environment } = options;
  if (
    environment !== "staging" ||
    !Array.isArray(productIds) ||
    productIds.length < 1 ||
    productIds.length > 100 ||
    new Set(productIds).size !== productIds.length ||
    productIds.some((id) => !knowledgeIdentifier(id))
  )
    throw new Error(
      "Reference index requires 1–100 unique staging product identities.",
    );
  const { data, metadata } = await query.graph({
    entity: "product",
    fields,
    filters: { id: productIds, status: "draft" },
    pagination: { take: 100, skip: 0, order: { id: "ASC" } },
  });
  const ids = new Set<string>();
  if (
    !Array.isArray(data) ||
    metadata?.count !== data.length ||
    data.length > productIds.length
  )
    throw new Error(
      "Incomplete scoped catalogue snapshot; retry reconciliation.",
    );
  for (const product of data) {
    if (
      !isKnowledgeRecord(product) ||
      typeof product.id !== "string" ||
      !productIds.includes(product.id) ||
      ids.has(product.id)
    )
      throw new Error(
        "Invalid scoped catalogue snapshot; retry reconciliation.",
      );
    ids.add(product.id);
  }
  const records: Record<string, unknown>[] = [];
  for (const product of data) {
    const binding = referenceBinding(product);
    if (!binding) continue;
    const document = await strapi.getKnowledgeReference(
      binding.document_id,
      binding.product_id,
      binding.revision_hash,
    );
    const card = referenceCard(product, document, environment, options.now);
    if (!card) continue;
    // Whitelist only the verified editorial body. Simulation/commerce metadata never enters search.
    records.push({
      id: card.product_id,
      product_id: card.product_id,
      variant_id: card.variant_id,
      document_id: card.document_id,
      revision_hash: card.revision_hash,
      product_title: card.product_title,
      document_title: card.document_title,
      text: card.text,
      facts: card.facts,
    });
  }
  await meilisearch.configureIndex(
    REFERENCE_INDEX_SETTINGS,
    "knowledge_reference",
  );
  if (records.length)
    await meilisearch.indexData(records, "knowledge_reference");
  const currentIds = new Set(records.map((record) => record.id));
  const stale = (
    await meilisearch.listDocumentIds("knowledge_reference")
  ).filter((id) => !currentIds.has(id));
  if (stale.length)
    await meilisearch.deleteFromIndex(stale, "knowledge_reference");
  return { indexed: records.length, deleted: stale.length };
}

/** Search discovers candidates; every returned fact/citation is freshly verified natively. */
export async function readIndexedReferencePage(
  options: Dependencies & { term: string; offset: number },
) {
  if (
    options.environment !== "staging" ||
    typeof options.term !== "string" ||
    !options.term.trim() ||
    options.term.length > 120 ||
    !Number.isInteger(options.offset) ||
    options.offset < 0 ||
    options.offset > 5000
  )
    throw new Error("Invalid reference search.");
  const result = await options.meilisearch.search<Record<string, unknown>>(
    options.term,
    "knowledge_reference",
    { limit: 4, offset: options.offset },
  );
  if (
    !Array.isArray(result.hits) ||
    result.hits.length > 4 ||
    !Number.isInteger(result.estimatedTotalHits) ||
    result.estimatedTotalHits < 0
  )
    throw new Error("Invalid reference index response.");
  const ids = new Set<string>();
  for (const hit of result.hits) {
    if (
      !isKnowledgeRecord(hit) ||
      !knowledgeIdentifier(hit.product_id) ||
      !knowledgeIdentifier(hit.variant_id) ||
      !knowledgeIdentifier(hit.document_id) ||
      !knowledgeDigest(hit.revision_hash) ||
      hit.id !== hit.product_id ||
      ids.has(hit.product_id as string)
    )
      throw new Error("Invalid reference index candidate.");
    ids.add(hit.product_id as string);
  }
  if (!ids.size) return { references: [], next_offset: null };
  const { data } = await options.query.graph({
    entity: "product",
    fields,
    filters: { id: [...ids], status: "draft" },
  });
  const references: KnowledgeReferenceCard[] = [];
  for (const hit of result.hits) {
    const matches = data.filter(
      (product) => isKnowledgeRecord(product) && product.id === hit.product_id,
    );
    if (matches.length !== 1) continue;
    const product = matches[0],
      binding = referenceBinding(product);
    if (
      !binding ||
      binding.document_id !== hit.document_id ||
      binding.revision_hash !== hit.revision_hash ||
      binding.variant_id !== hit.variant_id
    )
      continue;
    const document = await options.strapi.getKnowledgeReference(
      binding.document_id,
      binding.product_id,
      binding.revision_hash,
    );
    const card = referenceCard(
      product,
      document,
      options.environment,
      options.now,
    );
    if (card) references.push(card);
  }
  const next = options.offset + result.hits.length;
  return {
    references,
    next_offset: next < result.estimatedTotalHits && next <= 5000 ? next : null,
  };
}
