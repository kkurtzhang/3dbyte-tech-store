import { createHash } from "node:crypto";
import {
  isKnowledgeRecord,
  parseKnowledgeBody,
  parseApprovedKnowledgeDocument,
} from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
export function knowledgeBody(record: unknown) {
  if (
    !isKnowledgeRecord(record) ||
    !isKnowledgeRecord(record.knowledge_content)
  )
    return null;
  const content = record.knowledge_content;
  return parseKnowledgeBody({
    version: content.version,
    document_id: record.documentId,
    product_id: record.medusa_product_id,
    product_handle: record.product_handle,
    product_title: record.product_title,
    document_title: record.title,
    source_url: record.source_url,
    source_kind: record.source_kind,
    source_version: record.version,
    source_checked_at: record.source_checked_at,
    ...(content.binding_scope !== undefined
      ? { binding_scope: content.binding_scope }
      : {}),
    variant_id: content.variant_id,
    source_sha256: content.source_sha256,
    text: content.text,
    facts: content.facts,
  });
}
export function knowledgeRevision(record: unknown): string | null {
  const value = knowledgeBody(record);
  return value
    ? createHash("sha256").update(JSON.stringify(value)).digest("hex")
    : null;
}
/** Read-only verification; never creates approval or grants publication. */
export function approvedKnowledgeDocument(
  record: unknown,
  now = Date.now(),
  event?: unknown,
) {
  const value = knowledgeBody(record);
  if (
    !value ||
    !isKnowledgeRecord(record) ||
    record.is_public !== true ||
    typeof record.publishedAt !== "string" ||
    !Number.isFinite(Date.parse(record.publishedAt)) ||
    Date.parse(record.publishedAt) > now ||
    !isKnowledgeRecord(event)
  )
    return null;
  const review = event,
    hash = knowledgeRevision(record);
  if (
    review.decision !== "approved" ||
    review.actor_type !== "content_api_token" ||
    typeof review.actor_id !== "string" ||
    !/^[1-9][0-9]*$/.test(review.actor_id) ||
    !Number.isSafeInteger(review.id) ||
    (review.id as number) < 1 ||
    review.evidence_policy !== "official_or_two_independent" ||
    review.target_document_id !== value.document_id ||
    review.medusa_product_id !== value.product_id ||
    // Existing scope-less events are valid only for legacy exact-variant bodies.
    (review.binding_scope ??
      (value.binding_scope === undefined ? "variant" : null)) !==
      (value.binding_scope ?? "variant") ||
    review.medusa_variant_id !== value.variant_id ||
    review.content_revision !== hash ||
    typeof review.decided_at !== "string" ||
    !Number.isFinite(Date.parse(review.decided_at)) ||
    Date.parse(review.decided_at) > now ||
    Date.parse(review.decided_at) < Date.parse(value.source_checked_at)
  )
    return null;
  return parseApprovedKnowledgeDocument(
    { ...value, revision_hash: hash, valid_until: review.valid_until },
    now,
  );
}
