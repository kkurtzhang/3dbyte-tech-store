import type { Core } from "@strapi/strapi";
interface ReviewContext {
  state: unknown;
  params?: { documentId: string };
  query: Record<string, unknown>;
  request: { body?: unknown };
  body: unknown;
  status: number;
  set(name: string, value: string): void;
}
import { isKnowledgeRecord } from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
import {
  NativeDocumentError,
  previewDocumentRevision,
  reviewDocumentRevision,
} from "../api/product-document/utils/native-actions";
import {
  DOCUMENT_UID,
  REVIEW_ACTION,
  PILOT_PRODUCTS,
  isPilotDocument,
} from "./constants";
export { DOCUMENT_UID, REVIEW_ACTION, PILOT_PRODUCTS } from "./constants";

// Every model field disclosed by the canonical packet, including private JSON.
export const READ_FIELDS = [
  "medusa_product_id",
  "product_title",
  "product_handle",
  "title",
  "source_url",
  "source_kind",
  "source_checked_at",
  "version",
  "knowledge_content",
];
function principal(state: unknown) {
  if (
    !isKnowledgeRecord(state) ||
    state.isAuthenticated !== true ||
    !isKnowledgeRecord(state.auth) ||
    !isKnowledgeRecord(state.auth.strategy) ||
    state.auth.strategy.name !== "admin" ||
    !isKnowledgeRecord(state.auth.credentials) ||
    !Number.isSafeInteger(state.auth.credentials.id) ||
    (state.auth.credentials.id as number) < 1 ||
    state.auth.credentials.isActive !== true ||
    !isKnowledgeRecord(state.user) ||
    state.user.id !== state.auth.credentials.id ||
    !isKnowledgeRecord(state.auth.ability) ||
    typeof state.auth.ability.can !== "function" ||
    state.userAbility !== state.auth.ability
  )
    throw new NativeDocumentError("unauthorized");
  return {
    ability: state.auth.ability,
    actor: {
      actor_type: "admin_user",
      actor_id: String(state.auth.credentials.id),
    },
  };
}
function authorize(strapi: Core.Strapi, state: unknown, documentId: unknown) {
  const identity = principal(state);
  if (!isPilotDocument(documentId)) throw new NativeDocumentError("forbidden");
  const pilotId = documentId;
  const checker = strapi
    .plugin("content-manager")
    .service("permission-checker")
    .create({ userAbility: identity.ability, model: DOCUMENT_UID });
  function check(record?: Record<string, unknown>) {
    if (
      !checker.can(REVIEW_ACTION, record, "knowledge_content") ||
      !checker.can.update(record, "knowledge_content") ||
      READ_FIELDS.some((field) => !checker.can.read(record, field))
    )
      throw new NativeDocumentError("forbidden");
    if (
      record &&
      (record.documentId !== documentId ||
        record.medusa_product_id !== PILOT_PRODUCTS[pilotId])
    )
      throw new NativeDocumentError("forbidden");
  }
  check();
  return { actor: identity.actor, check };
}
/** Only decision metadata is returned; no hidden review notes or account profile data. */
function decision(event: Record<string, unknown> | null) {
  if (!event) return null;
  return {
    decision: event.decision,
    content_revision: event.content_revision,
    decided_at: event.decided_at,
    valid_until: event.valid_until,
    actor_type: event.actor_type,
    actor_id: event.actor_id,
  };
}
export async function previewAdminReview(
  strapi: Core.Strapi,
  state: unknown,
  documentId: unknown,
  status: unknown,
) {
  const { check } = authorize(strapi, state, documentId);
  const packet = await previewDocumentRevision(
    strapi,
    documentId,
    status,
    check,
  );
  return {
    ...packet,
    status,
    current_decision: decision(packet.current_decision),
  };
}
export async function reviewAdminDocument(
  strapi: Core.Strapi,
  state: unknown,
  documentId: unknown,
  raw: unknown,
) {
  const { actor, check } = authorize(strapi, state, documentId);
  return decision(
    await reviewDocumentRevision(strapi, actor, documentId, raw, check),
  );
}
function handler(strapi: Core.Strapi, write: boolean) {
  return async (ctx: ReviewContext) => {
    ctx.set("Cache-Control", "no-store");
    try {
      const allowedQuery = write ? [] : ["status"];
      if (Object.keys(ctx.query).some((key) => !allowedQuery.includes(key)))
        throw new NativeDocumentError("invalid_input");
      ctx.body = {
        data: write
          ? await reviewAdminDocument(
              strapi,
              ctx.state,
              ctx.params?.documentId,
              ctx.request.body,
            )
          : await previewAdminReview(
              strapi,
              ctx.state,
              ctx.params?.documentId,
              ctx.query.status,
            ),
      };
    } catch (error) {
      const code =
        error instanceof NativeDocumentError
          ? error.code
          : "review_unavailable";
      ctx.status = ["unauthorized", "forbidden"].includes(code)
        ? 403
        : ["invalid_input", "invalid_review"].includes(code)
          ? 400
          : [
                "revision_changed",
                "immutable_decision",
                "ambiguous_identity",
              ].includes(code)
            ? 409
            : 503;
      ctx.body = {
        error: {
          status: ctx.status,
          name: "KnowledgeReviewError",
          message: code,
        },
      };
      if (!(error instanceof NativeDocumentError))
        strapi.log.error("Knowledge review transaction failed");
    }
  };
}
/** Registration defines a capability; it never creates or modifies a role/user grant. */
export async function registerAdminReview(strapi: Core.Strapi) {
  await strapi.service("admin::permission").actionProvider.register({
    section: "contentTypes",
    displayName: "Review knowledge",
    uid: "knowledge-review.review",
    subjects: [DOCUMENT_UID],
    options: { applyToProperties: ["fields"] },
  });
  strapi.server.routes({
    type: "admin",
    prefix: "/knowledge-review",
    routes: [
      {
        method: "GET",
        path: "/:documentId",
        handler: handler(strapi, false),
        info: { type: "admin" },
        config: {
          auth: { strategies: ["admin"], scope: [REVIEW_ACTION] },
          policies: ["admin::isAuthenticatedAdmin"],
        },
      },
      {
        method: "POST",
        path: "/:documentId",
        handler: handler(strapi, true),
        info: { type: "admin" },
        config: {
          auth: { strategies: ["admin"], scope: [REVIEW_ACTION] },
          policies: ["admin::isAuthenticatedAdmin"],
        },
      },
    ],
  });
}
