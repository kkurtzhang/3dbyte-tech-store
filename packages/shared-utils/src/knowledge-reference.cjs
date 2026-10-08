"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KNOWLEDGE_MAX_AGE_MS =
  exports.knowledgeDigest =
  exports.knowledgeIdentifier =
  exports.isKnowledgeRecord =
    void 0;
exports.parseKnowledgeBody = parseKnowledgeBody;
exports.parseApprovedKnowledgeDocument = parseApprovedKnowledgeDocument;
const isKnowledgeRecord = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);
exports.isKnowledgeRecord = isKnowledgeRecord;
const knowledgeIdentifier = (v) =>
  typeof v === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(v);
exports.knowledgeIdentifier = knowledgeIdentifier;
const knowledgeDigest = (v) =>
  typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
exports.knowledgeDigest = knowledgeDigest;
const text = (v, max) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const timestamp = (v) =>
  typeof v === "string" &&
  /^\d{4}-\d\d-\d\dT/.test(v) &&
  Number.isFinite(Date.parse(v));
exports.KNOWLEDGE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
/** Whitelist a bounded, plain-text, single-source document revision. */
function parseKnowledgeBody(raw) {
  if (
    !(0, exports.isKnowledgeRecord)(raw) ||
    raw.version !== 1 ||
    ![raw.document_id, raw.product_id, raw.variant_id].every(
      exports.knowledgeIdentifier,
    ) ||
    !text(raw.product_handle, 200) ||
    !text(raw.product_title, 300) ||
    !text(raw.document_title, 300) ||
    !text(raw.source_url, 2048) ||
    !text(raw.source_version, 200) ||
    !(0, exports.knowledgeDigest)(raw.source_sha256) ||
    !timestamp(raw.source_checked_at) ||
    !text(raw.text, 20000) ||
    typeof raw.source_kind !== "string" ||
    ![
      "official_product_page",
      "official_manual",
      "official_datasheet",
      "official_safety_sheet",
      "supplier_product_page",
    ].includes(raw.source_kind) ||
    !Array.isArray(raw.facts) ||
    raw.facts.length < 1 ||
    raw.facts.length > 30
  )
    return null;
  try {
    const url = new URL(raw.source_url);
    if (url.protocol !== "https:" || url.username || url.password) return null;
  } catch {
    return null;
  }
  const facts = [],
    fields = new Set();
  for (const fact of raw.facts) {
    if (
      !(0, exports.isKnowledgeRecord)(fact) ||
      !(0, exports.knowledgeIdentifier)(fact.field) ||
      fields.has(fact.field) ||
      !text(fact.label, 120) ||
      (fact.value !== null && !text(fact.value, 500)) ||
      typeof fact.evidence_excerpt !== "string" ||
      fact.evidence_excerpt.length > 1500 ||
      (fact.value === null
        ? fact.evidence_excerpt !== ""
        : !fact.evidence_excerpt.trim() ||
          !raw.text.includes(fact.evidence_excerpt)) ||
      (fact.page !== undefined &&
        (typeof fact.page !== "number" ||
          !Number.isInteger(fact.page) ||
          fact.page < 1 ||
          fact.page > 1000))
    )
      return null;
    fields.add(fact.field);
    facts.push({
      field: fact.field,
      label: fact.label,
      value: fact.value,
      evidence_excerpt: fact.evidence_excerpt,
      ...(fact.page !== undefined ? { page: fact.page } : {}),
    });
  }
  // Explicit order is the canonical hash input. Discard unrelated/private fields.
  return {
    version: 1,
    document_id: raw.document_id,
    product_id: raw.product_id,
    variant_id: raw.variant_id,
    product_handle: raw.product_handle,
    product_title: raw.product_title,
    document_title: raw.document_title,
    source_url: raw.source_url,
    source_kind: raw.source_kind,
    source_sha256: raw.source_sha256,
    source_version: raw.source_version,
    source_checked_at: raw.source_checked_at,
    text: raw.text,
    facts,
  };
}
function parseApprovedKnowledgeDocument(raw, now = Date.now()) {
  const body = parseKnowledgeBody(raw);
  if (
    !body ||
    !(0, exports.isKnowledgeRecord)(raw) ||
    !(0, exports.knowledgeDigest)(raw.revision_hash) ||
    !timestamp(raw.valid_until)
  )
    return null;
  const checked = Date.parse(body.source_checked_at),
    expires = Date.parse(raw.valid_until);
  if (
    checked > now ||
    now - checked > exports.KNOWLEDGE_MAX_AGE_MS ||
    expires <= now ||
    expires > checked + exports.KNOWLEDGE_MAX_AGE_MS
  )
    return null;
  return {
    ...body,
    revision_hash: raw.revision_hash,
    valid_until: raw.valid_until,
  };
}
