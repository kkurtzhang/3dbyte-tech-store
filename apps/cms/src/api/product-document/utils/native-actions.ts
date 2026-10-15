import { createHash } from "node:crypto";
import type { Core } from "@strapi/strapi";
import {
  isKnowledgeRecord,
  knowledgeIdentifier,
  knowledgeDigest,
  parseApprovedKnowledgeDocument,
} from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
import { knowledgeBody, knowledgeRevision } from "./knowledge-reference";
import { createReviewEvent } from "../../product-document-review/utils/write-guard";

export const REVIEW_UID =
  "api::product-document-review.product-document-review";
const DOCUMENT_UID = "api::product-document.product-document";

export class NativeDocumentError extends Error {
  constructor(
    readonly code: string,
    readonly documentIds: string[] = [],
  ) {
    super(code);
  }
}
export function authenticatedActor(state: unknown) {
  if (
    !isKnowledgeRecord(state) ||
    state.isAuthenticated !== true ||
    !isKnowledgeRecord(state.auth) ||
    !isKnowledgeRecord(state.auth.strategy) ||
    state.auth.strategy.name !== "content-api-token" ||
    !isKnowledgeRecord(state.auth.credentials) ||
    state.auth.credentials.type !== "full-access" ||
    !Number.isSafeInteger(state.auth.credentials.id) ||
    (state.auth.credentials.id as number) < 1
  )
    throw new NativeDocumentError("unauthorized");
  return {
    actor_type: "content_api_token",
    actor_id: String(state.auth.credentials.id),
  };
}
export function canonicalSource(value: unknown) {
  if (typeof value !== "string" || value.length > 2048)
    throw new NativeDocumentError("invalid_input");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new NativeDocumentError("invalid_input");
  }
  if (url.protocol !== "https:" || url.username || url.password)
    throw new NativeDocumentError("invalid_input");
  url.hash = "";
  return url.href;
}
export function revisionKey(documentId: string, revision: string) {
  return createHash("sha256")
    .update(`${documentId}\n${revision}`)
    .digest("hex");
}

/** Strapi 5 propagates this transaction to document/query calls via AsyncLocalStorage. */
async function locked<T>(
  strapi: Core.Strapi,
  scope: string,
  execute: (trx: Core.Strapi["db"]["connection"]) => Promise<T>,
): Promise<T> {
  if (
    !["pg", "postgres", "postgresql"].includes(
      strapi.db.connection.client.config.client,
    )
  )
    throw new NativeDocumentError("unsupported_database");
  const hash = createHash("sha256").update(scope).digest();
  return strapi.db.transaction(async ({ trx }) => {
    await trx.raw("SELECT set_config('lock_timeout', '5000ms', true)");
    await trx.raw("SELECT pg_advisory_xact_lock(?, ?)", [
      hash.readInt32BE(0),
      hash.readInt32BE(4),
    ]);
    return execute(trx);
  });
}

const intakeKeys = [
  "medusa_product_id",
  "product_title",
  "product_handle",
  "title",
  "document_type",
  "source_url",
  "source_kind",
  "source_label",
  "source_checked_at",
  "search_keywords",
  "is_public",
];
function intakeData(raw: unknown) {
  if (
    !isKnowledgeRecord(raw) ||
    Object.keys(raw).some((key) => !intakeKeys.includes(key)) ||
    !knowledgeIdentifier(raw.medusa_product_id) ||
    raw.is_public !== false ||
    ![
      "manual",
      "datasheet",
      "install_guide",
      "safety_sheet",
      "warranty",
      "other",
    ].includes(String(raw.document_type)) ||
    ![
      "official_product_page",
      "official_manual",
      "official_datasheet",
      "official_safety_sheet",
      "supplier_product_page",
    ].includes(String(raw.source_kind)) ||
    ["product_title", "product_handle", "title", "source_label"].some(
      (key) =>
        typeof raw[key] !== "string" ||
        !(raw[key] as string).trim() ||
        (raw[key] as string).length > 300,
    ) ||
    typeof raw.source_checked_at !== "string" ||
    !Number.isFinite(Date.parse(raw.source_checked_at)) ||
    Date.parse(raw.source_checked_at) > Date.now() ||
    !Array.isArray(raw.search_keywords) ||
    raw.search_keywords.length > 30 ||
    raw.search_keywords.some((x) => typeof x !== "string" || x.length > 100)
  )
    throw new NativeDocumentError("invalid_input");
  return {
    medusa_product_id: raw.medusa_product_id as string,
    product_title: raw.product_title as string,
    product_handle: raw.product_handle as string,
    title: raw.title as string,
    source_url: canonicalSource(raw.source_url),
    source_label: raw.source_label as string,
    source_kind: raw.source_kind as
      | "official_product_page"
      | "official_manual"
      | "official_datasheet"
      | "official_safety_sheet"
      | "supplier_product_page",
    document_type: raw.document_type as
      | "manual"
      | "datasheet"
      | "install_guide"
      | "safety_sheet"
      | "warranty"
      | "other",
    source_checked_at: raw.source_checked_at as string,
    search_keywords: raw.search_keywords as string[],
    is_public: false,
  };
}

/** One lock for an exact native product + canonical source, across draft/published versions. */
export async function upsertNativeDocument(
  strapi: Core.Strapi,
  state: unknown,
  raw: unknown,
) {
  authenticatedActor(state);
  const data = intakeData(raw);
  return locked(
    strapi,
    `product-source:${data.medusa_product_id}:${data.source_url}`,
    async () => {
      const matches: Record<string, unknown>[] = [];
      for (const status of ["draft", "published"] as const) {
        const records = await strapi.documents(DOCUMENT_UID).findMany({
          status,
          filters: { medusa_product_id: { $eq: data.medusa_product_id } },
          limit: 201,
        });
        if (records.length > 200)
          throw new NativeDocumentError("incomplete_identity_snapshot");
        for (const record of records) {
          if (
            record.medusa_product_id !== data.medusa_product_id ||
            !knowledgeIdentifier(record.documentId)
          )
            throw new NativeDocumentError("invalid_identity_snapshot");
          if (
            record.source_url &&
            canonicalSource(record.source_url) === data.source_url
          )
            matches.push(record);
        }
      }
      const ids = [
        ...new Set(matches.map((record) => record.documentId as string)),
      ].sort();
      if (ids.length > 1)
        throw new NativeDocumentError("ambiguous_identity", ids);
      if (
        matches.some(
          (record) =>
            record.publishedAt ||
            record.knowledge_content ||
            record.knowledge_review,
        )
      )
        throw new NativeDocumentError("protected_document", ids);
      const validatedUpdate: Record<string, unknown> = data;
      const result = ids.length
        ? await strapi.documents(DOCUMENT_UID).update({
            documentId: ids[0],
            status: "draft",
            data: validatedUpdate,
          })
        : await strapi
            .documents(DOCUMENT_UID)
            .create({ status: "draft", data });
      return {
        documentId: result.documentId,
        medusa_product_id: data.medusa_product_id,
        source_url: data.source_url,
      };
    },
  );
}

export async function loadReviewEvents(
  strapi: Core.Strapi,
  records: unknown[],
) {
  const keys = [
    ...new Set(
      records.flatMap((record) => {
        const hash = knowledgeRevision(record);
        return hash &&
          isKnowledgeRecord(record) &&
          knowledgeIdentifier(record.documentId)
          ? [revisionKey(record.documentId as string, hash)]
          : [];
      }),
    ),
  ];
  if (!keys.length) return [];
  if (keys.length > 200)
    throw new NativeDocumentError("incomplete_review_snapshot");
  const events = await strapi.db.query(REVIEW_UID).findMany({
    where: { revision_key: { $in: keys } },
    limit: keys.length + 1,
  });
  if (
    !Array.isArray(events) ||
    events.length > keys.length ||
    new Set(events.map((e) => e.revision_key)).size !== events.length ||
    events.some((e) => !keys.includes(e.revision_key))
  )
    throw new NativeDocumentError("ambiguous_review_snapshot");
  return events;
}

/** Read-only private review packet; no approval is implied by returning this content. */
export async function previewNativeReview(
  strapi: Core.Strapi,
  state: unknown,
  documentId: unknown,
  status: unknown,
) {
  authenticatedActor(state);
  return previewDocumentRevision(strapi, documentId, status);
}

/** Internal capability: callers must authenticate before invoking this helper. */
export async function previewDocumentRevision(
  strapi: Core.Strapi,
  documentId: unknown,
  status: unknown,
  authorizeRecord?: (record: Record<string, unknown>) => void,
) {
  if (
    !knowledgeIdentifier(documentId) ||
    !["draft", "published"].includes(String(status))
  )
    throw new NativeDocumentError("invalid_input");
  const records = await strapi.documents(DOCUMENT_UID).findMany({
    status: status as "draft" | "published",
    filters: { documentId: { $eq: documentId } },
    limit: 2,
    ...(authorizeRecord
      ? {
          populate: {
            createdBy: { fields: ["id"] },
            updatedBy: { fields: ["id"] },
          },
        }
      : {}),
  });
  if (records.length !== 1 || records[0].documentId !== documentId)
    throw new NativeDocumentError("ambiguous_identity");
  authorizeRecord?.(records[0]);
  const document = knowledgeBody(records[0]),
    revision = knowledgeRevision(records[0]);
  if (!document || !revision) throw new NativeDocumentError("invalid_review");
  const events = await loadReviewEvents(strapi, records);
  return {
    document,
    revision_hash: revision,
    current_decision: events[0] ?? null,
  };
}

/** One immutable decision per canonical revision; timestamps and actor come from the server. */
export async function reviewNativeDocument(
  strapi: Core.Strapi,
  state: unknown,
  documentId: unknown,
  raw: unknown,
) {
  const actor = authenticatedActor(state);
  return reviewDocumentRevision(strapi, actor, documentId, raw);
}

/** Internal capability. Identity is derived by the authenticated boundary, never the request body. */
export async function reviewDocumentRevision(
  strapi: Core.Strapi,
  actor: { actor_type: string; actor_id: string },
  documentId: unknown,
  raw: unknown,
  authorizeRecord?: (record: Record<string, unknown>) => void,
) {
  const allowed = [
    "revision_hash",
    "status",
    "decision",
    "valid_until",
    "evidence_policy",
    "review_note",
  ];
  if (
    !knowledgeIdentifier(documentId) ||
    !isKnowledgeRecord(raw) ||
    Object.keys(raw).some((key) => !allowed.includes(key)) ||
    !knowledgeDigest(raw.revision_hash) ||
    !["draft", "published"].includes(String(raw.status)) ||
    !["approved", "rejected"].includes(String(raw.decision)) ||
    raw.evidence_policy !== "official_or_two_independent" ||
    typeof raw.review_note !== "string" ||
    !raw.review_note.trim() ||
    raw.review_note.length > 2000
  )
    throw new NativeDocumentError("invalid_input");
  return locked(strapi, `review:${documentId}`, async (trx) => {
    // Ordinary Content Manager edits do not acquire our advisory lock. Lock both
    // draft/published rows before reading so a concurrent writer cannot approve
    // a version it changed while this transaction was waiting.
    await strapi.db
      .queryBuilder(DOCUMENT_UID)
      .select(["id"])
      .where({ documentId })
      .orderBy({ id: "asc" })
      .transacting(trx)
      .forUpdate()
      .execute();
    const records = await strapi.documents(DOCUMENT_UID).findMany({
      status: raw.status as "draft" | "published",
      filters: { documentId: { $eq: documentId } },
      limit: 2,
      ...(authorizeRecord
        ? {
            populate: {
              createdBy: { fields: ["id"] },
              updatedBy: { fields: ["id"] },
            },
          }
        : {}),
    });
    if (records.length !== 1 || records[0].documentId !== documentId)
      throw new NativeDocumentError("ambiguous_identity");
    authorizeRecord?.(records[0]);
    const record = records[0],
      body = knowledgeBody(record),
      revision = knowledgeRevision(record);
    if (!body || revision !== raw.revision_hash)
      throw new NativeDocumentError("revision_changed");
    const now = Date.now();
    if (
      !parseApprovedKnowledgeDocument(
        { ...body, revision_hash: revision, valid_until: raw.valid_until },
        now,
      )
    )
      throw new NativeDocumentError("invalid_review");
    const existing = await loadReviewEvents(strapi, records);
    if (existing.length) {
      if (
        existing[0].decision !== raw.decision ||
        Date.parse(existing[0].valid_until) !==
          Date.parse(raw.valid_until as string)
      )
        throw new NativeDocumentError("immutable_decision");
      return existing[0];
    }
    const data = {
      revision_key: revisionKey(documentId as string, revision),
      target_document_id: documentId as string,
      medusa_product_id: body.product_id,
      binding_scope: body.binding_scope ?? "variant",
      medusa_variant_id: body.variant_id,
      content_revision: revision,
      decision: raw.decision as "approved" | "rejected",
      decided_at: new Date(now).toISOString(),
      valid_until: raw.valid_until as string,
      evidence_policy: raw.evidence_policy as string,
      review_note: raw.review_note as string,
      ...actor,
    };
    return createReviewEvent(data, () =>
      strapi.documents(REVIEW_UID).create({ data }),
    );
  });
}
