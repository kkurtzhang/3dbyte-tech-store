import { isKnowledgeRecord } from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
import { approvedKnowledgeDocument } from "./knowledge-reference";

/** Join only an unchanged public metadata record to its currently approved body. */
export function approvedPublicProjection(
  publicRecord: unknown,
  nativeRecords: unknown[],
  now = Date.now(),
  events: unknown[] = [],
) {
  if (!isKnowledgeRecord(publicRecord)) return null;
  const matches = nativeRecords.filter(
    (record) =>
      isKnowledgeRecord(record) &&
      record.documentId === publicRecord.documentId,
  );
  if (matches.length !== 1 || !isKnowledgeRecord(matches[0])) return null;
  const native = matches[0];
  const fields = [
    "documentId",
    "medusa_product_id",
    "product_handle",
    "product_title",
    "title",
    "source_url",
    "source_kind",
    "version",
    "source_checked_at",
  ];
  if (fields.some((field) => publicRecord[field] !== native[field]))
    return null;
  const decisions = events.filter(
    (event) =>
      isKnowledgeRecord(event) &&
      event.target_document_id === native.documentId,
  );
  return decisions.length === 1
    ? approvedKnowledgeDocument(native, now, decisions[0])
    : null;
}
