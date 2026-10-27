import type {
  ApprovedKnowledgeDocument,
  KnowledgeRetrievalAvailability,
} from "@3dbyte-tech-store/shared-types";
import {
  isKnowledgeRecord,
  knowledgeIdentifier,
  knowledgeDigest,
  knowledgeBinding,
} from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
import {
  knowledgeForPublishedProduct,
  readKnowledgeProducts,
  type KnowledgeDependencies,
} from "./contract";

type Candidate = {
  id: string;
  productId: string;
  bindingScope: "product" | "variant";
  variantId: string | null;
  revision: string;
};

/** Resolve exact native ownership before unrelated model documents consume the bound. */
async function readVariantOwner(
  query: KnowledgeDependencies["query"],
  variantId: string,
): Promise<string | null> {
  const result = await query.graph({
    entity: "product_variant",
    fields: ["id", "product.id", "product.status"],
    filters: { id: [variantId] },
    pagination: { take: 2, skip: 0 },
  });
  if (
    !Array.isArray(result.data) ||
    result.metadata?.count !== result.data.length ||
    result.data.length > 1
  )
    throw new Error("Incomplete knowledge variant ownership.");
  if (!result.data.length) return null;
  const variant = result.data[0];
  if (
    !isKnowledgeRecord(variant) ||
    variant.id !== variantId ||
    !isKnowledgeRecord(variant.product) ||
    !knowledgeIdentifier(variant.product.id)
  )
    throw new Error("Invalid knowledge variant ownership.");
  return variant.product.status === "published"
    ? (variant.product.id as string)
    : null;
}

/** Search locates candidates; indexed text can never become answer evidence. */
export async function retrieveProductKnowledge(
  options: KnowledgeDependencies & {
    queryText: string;
    productId?: string;
    variantId?: string;
    limit?: number;
  },
) {
  const limit = options.limit ?? 4;
  if (
    typeof options.queryText !== "string" ||
    !options.queryText.trim() ||
    options.queryText.length > 120 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 4 ||
    (options.productId !== undefined &&
      !knowledgeIdentifier(options.productId)) ||
    (options.variantId !== undefined && !knowledgeIdentifier(options.variantId))
  )
    throw new Error("Invalid knowledge search.");
  let productId = options.productId;
  if (options.variantId) {
    const ownerId = await readVariantOwner(options.query, options.variantId);
    if (!ownerId || (productId && productId !== ownerId))
      return {
        documents: [],
        citations: [],
        availability: "no_match" as KnowledgeRetrievalAvailability,
      };
    productId = ownerId;
  }
  const filter = [
    // This field is emitted only for approved knowledge, never metadata-only records.
    "knowledge_revision_hash EXISTS",
    ...(productId ? [`medusa_product_id = "${productId}"`] : []),
    ...(options.variantId
      ? [
          `(knowledge_binding_scope = "product" OR knowledge_variant_id = "${options.variantId}")`,
        ]
      : []),
  ];
  const searchCandidates = async (queryText: string) => {
    const result = await options.meilisearch.search(
      queryText,
      "product_document",
      { limit: 8, filter },
    );
    if (!Array.isArray(result.hits) || result.hits.length > 8)
      throw new Error("Invalid document search response.");
    return result.hits;
  };
  let hits = await searchCandidates(options.queryText.trim());
  // Natural questions may have no lexical match. An exact product (including
  // a verified variant owner) permits one bounded lookup of its approved docs.
  // Keep every identity filter; these candidates still require source validation.
  if (hits.length === 0 && productId) hits = await searchCandidates("");
  const candidates: Candidate[] = [];
  const ids = new Set<string>();
  for (const hit of hits) {
    // Metadata-only public documents remain discoverable but cannot ground factual answers.
    if (
      !isKnowledgeRecord(hit) ||
      !knowledgeIdentifier(hit.id) ||
      !knowledgeIdentifier(hit.medusa_product_id) ||
      !knowledgeDigest(hit.knowledge_revision_hash)
    )
      continue;
    const binding = knowledgeBinding({
      binding_scope: hit.knowledge_binding_scope,
      variant_id: hit.knowledge_variant_id,
    });
    if (!binding) continue;
    const candidate: Candidate = {
      id: hit.id as string,
      productId: hit.medusa_product_id as string,
      bindingScope: binding.binding_scope,
      variantId: binding.variant_id,
      revision: hit.knowledge_revision_hash as string,
    };
    if (ids.has(candidate.id))
      throw new Error("Ambiguous document search response.");
    ids.add(candidate.id);
    if (
      (productId && candidate.productId !== productId) ||
      (options.variantId &&
        candidate.bindingScope === "variant" &&
        candidate.variantId !== options.variantId)
    )
      continue;
    candidates.push(candidate);
  }
  const products = await readKnowledgeProducts(
    options.query,
    candidates.map((c) => c.productId),
  );
  const current = await Promise.all(
    candidates.map(async (candidate) => {
      const raw = await options.strapi.getKnowledgeReference(
        candidate.id,
        candidate.productId,
        candidate.revision,
        { failSoft: false },
      );
      const product = products.get(candidate.productId);
      // Model guidance may accompany an exact-variant query only for its own product.
      if (
        options.variantId &&
        (!Array.isArray(product?.variants) ||
          product.variants.filter(
            (v) => isKnowledgeRecord(v) && v.id === options.variantId,
          ).length !== 1)
      )
        return null;
      const document = knowledgeForPublishedProduct(raw, product, options.now);
      return document?.document_id === candidate.id &&
        document.product_id === candidate.productId &&
        (document.binding_scope ?? "variant") === candidate.bindingScope &&
        document.variant_id === candidate.variantId &&
        document.revision_hash === candidate.revision
        ? document
        : null;
    }),
  );
  const documents = current
    .filter((d): d is ApprovedKnowledgeDocument => d !== null)
    .slice(0, limit);
  const citations = documents.map((d) => ({
    document_id: d.document_id,
    product_id: d.product_id,
    binding_scope: d.binding_scope ?? "variant",
    variant_id: d.variant_id,
    title: d.document_title,
    source_url: d.source_url,
    source_sha256: d.source_sha256,
    source_version: d.source_version,
    source_checked_at: d.source_checked_at,
    revision_hash: d.revision_hash,
    valid_until: d.valid_until,
  }));
  return {
    documents,
    citations,
    availability: (documents.length
      ? "available"
      : candidates.length
        ? "not_current"
        : "no_match") as KnowledgeRetrievalAvailability,
  };
}
