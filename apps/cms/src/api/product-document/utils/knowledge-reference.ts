import { createHash } from "node:crypto";
import {
  isKnowledgeRecord,
  parseKnowledgeBody,
  parseApprovedKnowledgeDocument,
} from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
function body(record: unknown) {
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
    variant_id: content.variant_id,
    source_sha256: content.source_sha256,
    text: content.text,
    facts: content.facts,
  });
}
export function knowledgeRevision(record: unknown): string | null {
  const value = body(record);
  return value
    ? createHash("sha256").update(JSON.stringify(value)).digest("hex")
    : null;
}
/** Read-only verification; never creates approval or grants publication. */
export function approvedKnowledgeDocument(record: unknown, now = Date.now()) {
  const value = body(record);
  if (
    !value ||
    !isKnowledgeRecord(record) ||
    record.is_public !== true ||
    typeof record.publishedAt !== "string" ||
    !Number.isFinite(Date.parse(record.publishedAt)) ||
    Date.parse(record.publishedAt) > now ||
    !isKnowledgeRecord(record.knowledge_review)
  )
    return null;
  const review = record.knowledge_review,
    hash = knowledgeRevision(record);
  if (
    review.status !== "approved" ||
    review.document_id !== value.document_id ||
    review.product_id !== value.product_id ||
    review.variant_id !== value.variant_id ||
    review.revision_hash !== hash ||
    typeof review.reviewed_at !== "string" ||
    !Number.isFinite(Date.parse(review.reviewed_at)) ||
    Date.parse(review.reviewed_at) > now ||
    Date.parse(review.reviewed_at) < Date.parse(value.source_checked_at)
  )
    return null;
  return parseApprovedKnowledgeDocument(
    { ...value, revision_hash: hash, valid_until: review.valid_until },
    now,
  );
}
