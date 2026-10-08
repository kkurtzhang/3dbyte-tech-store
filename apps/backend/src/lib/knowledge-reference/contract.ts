import type {
  ApprovedKnowledgeDocument,
  KnowledgeReferenceCard,
} from "@3dbyte-tech-store/shared-types";
import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";
import {
  isKnowledgeRecord,
  knowledgeDigest,
  knowledgeIdentifier,
  parseApprovedKnowledgeDocument,
  parseKnowledgeBody,
} from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
export function verifiedReferenceDocument(raw: unknown, now = Date.now()) {
  const doc = parseApprovedKnowledgeDocument(raw, now);
  const body = parseKnowledgeBody(doc);
  return doc &&
    body &&
    createHash("sha256").update(JSON.stringify(body)).digest("hex") ===
      doc.revision_hash
    ? doc
    : null;
}

function eligibleShell(raw: unknown, doc: ApprovedKnowledgeDocument) {
  if (
    !isKnowledgeRecord(raw) ||
    raw.status !== "draft" ||
    raw.id !== doc.product_id ||
    raw.handle !== doc.product_handle ||
    raw.title !== doc.product_title ||
    !Array.isArray(raw.variants) ||
    raw.variants.length !== 1
  )
    return false;
  const variant = raw.variants[0];
  if (!isKnowledgeRecord(variant) || variant.id !== doc.variant_id)
    return false;
  if (
    variant.price_set !== null &&
    variant.price_set !== undefined &&
    (!isKnowledgeRecord(variant.price_set) ||
      !Array.isArray(variant.price_set.prices) ||
      variant.price_set.prices.length !== 0)
  )
    return false;
  return !Array.isArray(variant.prices) || variant.prices.length === 0;
}
/** Prepare metadata only: no write, pricing, approval or commerce normalization. */
export function bindKnowledgeReference(
  product: unknown,
  document: ApprovedKnowledgeDocument,
  env: string | undefined,
) {
  if (
    env !== "staging" ||
    !eligibleShell(product, document) ||
    !isKnowledgeRecord(product)
  )
    throw new Error(
      "Reference binding requires an exact unpriced staging draft shell.",
    );
  const existing = isKnowledgeRecord(product.metadata) ? product.metadata : {};
  const binding = {
    version: 1,
    scope: "staging",
    product_id: document.product_id,
    variant_id: document.variant_id,
    document_id: document.document_id,
    revision_hash: document.revision_hash,
    checkout_enabled: false,
  };
  if (
    (existing.catalogue_role !== undefined &&
      existing.catalogue_role !== "knowledge_reference") ||
    (existing.knowledge_reference !== undefined &&
      !isDeepStrictEqual(existing.knowledge_reference, binding))
  )
    throw new Error(
      "Conflicting reference role or revision; reconcile explicitly.",
    );
  return {
    ...existing,
    catalogue_role: "knowledge_reference",
    knowledge_reference: binding,
  };
}
export function referenceBinding(raw: unknown) {
  if (
    !isKnowledgeRecord(raw) ||
    !isKnowledgeRecord(raw.metadata) ||
    raw.metadata.catalogue_role !== "knowledge_reference" ||
    !isKnowledgeRecord(raw.metadata.knowledge_reference)
  )
    return null;
  const b = raw.metadata.knowledge_reference;
  return b.version === 1 &&
    b.scope === "staging" &&
    b.checkout_enabled === false &&
    b.product_id === raw.id &&
    knowledgeIdentifier(b.product_id) &&
    knowledgeIdentifier(b.variant_id) &&
    knowledgeIdentifier(b.document_id) &&
    knowledgeDigest(b.revision_hash)
    ? {
        product_id: b.product_id,
        variant_id: b.variant_id,
        document_id: b.document_id,
        revision_hash: b.revision_hash,
      }
    : null;
}
export function referenceCard(
  product: unknown,
  rawDocument: unknown,
  env: string | undefined,
  now = Date.now(),
): KnowledgeReferenceCard | null {
  if (
    env !== "staging" ||
    !isKnowledgeRecord(product) ||
    !isKnowledgeRecord(product.metadata)
  )
    return null;
  const binding = referenceBinding(product),
    document = verifiedReferenceDocument(rawDocument, now),
    marker = product.metadata.catalogue_simulation;
  if (
    !binding ||
    !document ||
    !eligibleShell(product, document) ||
    binding.document_id !== document.document_id ||
    binding.revision_hash !== document.revision_hash ||
    binding.variant_id !== document.variant_id ||
    !isKnowledgeRecord(marker) ||
    marker.version !== 1 ||
    marker.scope !== "staging" ||
    marker.real_stock !== false ||
    marker.product_id !== binding.product_id ||
    marker.variant_id !== binding.variant_id ||
    typeof marker.initial_quantity !== "number" ||
    !Number.isInteger(marker.initial_quantity) ||
    marker.initial_quantity < 0 ||
    marker.initial_quantity > 30
  )
    return null;
  return {
    ...document,
    scope: "staging",
    catalogue_role: "knowledge_reference",
    checkout_enabled: false,
    price: null,
    simulated_initial_quantity: marker.initial_quantity,
  };
}
