/**
 * product-document controller
 */

import { factories } from "@strapi/strapi";
import {
  knowledgeIdentifier,
  knowledgeDigest,
} from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
import { approvedKnowledgeDocument } from "../utils/knowledge-reference";
import { approvedPublicProjection } from "../utils/public-knowledge-projection";
import {
  loadReviewEvents,
  previewNativeReview,
  NativeDocumentError,
  reviewNativeDocument,
  upsertNativeDocument,
} from "../utils/native-actions";

const uid = "api::product-document.product-document";
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function publicQuery(query: Record<string, unknown>) {
  return {
    ...query,
    status: "published",
    filters: {
      ...(isRecord(query.filters) ? query.filters : {}),
      is_public: { $eq: true },
    },
  };
}

function actionFailure(ctx, error: unknown) {
  if (!(error instanceof NativeDocumentError)) {
    ctx.status = 503;
    return { error: "Native document action unavailable." };
  }
  ctx.status =
    error.code === "unauthorized"
      ? 403
      : error.code === "invalid_input" || error.code === "invalid_review"
        ? 400
        : error.code === "unsupported_database"
          ? 503
          : 409;
  return {
    error: error.code,
    ...(error.documentIds.length
      ? { repair: { document_ids: error.documentIds } }
      : {}),
  };
}

export default factories.createCoreController(uid, ({ strapi }) => ({
  async importUpsert(ctx) {
    ctx.set("Cache-Control", "no-store");
    try {
      return {
        data: await upsertNativeDocument(
          strapi,
          ctx.state,
          ctx.request.body?.data,
        ),
      };
    } catch (error) {
      return actionFailure(ctx, error);
    }
  },
  async reviewPreview(ctx) {
    ctx.set("Cache-Control", "no-store");
    try {
      if (Object.keys(ctx.query).some((key) => key !== "status"))
        throw new NativeDocumentError("invalid_input");
      return {
        data: await previewNativeReview(
          strapi,
          ctx.state,
          ctx.params.documentId,
          ctx.query.status,
        ),
      };
    } catch (error) {
      return actionFailure(ctx, error);
    }
  },
  async reviewKnowledge(ctx) {
    ctx.set("Cache-Control", "no-store");
    try {
      return {
        data: await reviewNativeDocument(
          strapi,
          ctx.state,
          ctx.params.documentId,
          ctx.request.body?.data,
        ),
      };
    } catch (error) {
      return actionFailure(ctx, error);
    }
  },
  async knowledgeReference(ctx) {
    ctx.set("Cache-Control", "no-store");
    const { medusa_product_id: productId, revision } = ctx.query;
    if (
      !knowledgeIdentifier(ctx.params.documentId) ||
      !knowledgeIdentifier(productId) ||
      !knowledgeDigest(revision) ||
      Object.keys(ctx.query).some(
        (key) => !["medusa_product_id", "revision"].includes(key),
      )
    )
      return ctx.badRequest(
        "An exact document, product and revision are required.",
      );
    const records = await strapi.documents(uid).findMany({
      status: "published",
      filters: {
        documentId: { $eq: ctx.params.documentId },
        medusa_product_id: { $eq: productId },
        is_public: { $eq: true },
      },
      limit: 2,
    });
    const events =
      records.length === 1 ? await loadReviewEvents(strapi, records) : [];
    const document =
      records.length === 1 && events.length === 1
        ? approvedKnowledgeDocument(records[0], Date.now(), events[0])
        : null;
    // Publish only the approved whitelisted DTO, never the private native record.
    return document && document.revision_hash === revision
      ? { data: document }
      : ctx.notFound();
  },
  async find(ctx) {
    const { knowledge, ...query } = ctx.query;
    if (knowledge !== undefined && knowledge !== "approved")
      return ctx.badRequest("Unsupported knowledge projection.");
    ctx.query = publicQuery(query);
    if (knowledge === undefined) return super.find(ctx);
    const page = isRecord(query.pagination)
      ? Number(query.pagination.page ?? 1)
      : 1;
    if (!Number.isSafeInteger(page) || page < 1 || page > 100)
      return ctx.badRequest("Invalid knowledge page.");
    ctx.query = publicQuery({
      ...query,
      pagination: { page, pageSize: 25, withCount: true },
    });
    ctx.set("Cache-Control", "no-store");
    const result = await super.find(ctx);
    if (!Array.isArray(result?.data) || result.data.length > 25)
      throw new Error("Invalid public document page.");
    const ids = result.data.map((record) => record.documentId);
    if (
      ids.some((id) => !knowledgeIdentifier(id)) ||
      new Set(ids).size !== ids.length
    )
      throw new Error("Ambiguous public document page.");
    const records = ids.length
      ? await strapi.documents(uid).findMany({
          status: "published",
          filters: { documentId: { $in: ids }, is_public: { $eq: true } },
          limit: ids.length + 1,
        })
      : [];
    const events = await loadReviewEvents(strapi, records);
    return {
      ...result,
      data: result.data.map((record) => {
        const approved = approvedPublicProjection(
          record,
          records,
          Date.now(),
          events,
        );
        // super.find performs normal Content API sanitization. Never spread the
        // private lookup into the public response or accept caller supplied JSON.
        return {
          ...record,
          ...(approved ? { approved_knowledge: approved } : {}),
        };
      }),
    };
  },

  async findOne(ctx) {
    ctx.query = publicQuery(ctx.query);
    const result = await super.findOne(ctx);
    return result?.data ? result : ctx.notFound();
  },

  async importLookup(ctx) {
    // Trust only Strapi's verified token state, never a raw Bearer header.
    const auth: unknown = ctx.state.auth;
    if (
      !ctx.state.isAuthenticated ||
      !isRecord(auth) ||
      !isRecord(auth.strategy) ||
      auth.strategy.name !== "content-api-token" ||
      !isRecord(auth.credentials) ||
      auth.credentials.type !== "full-access"
    ) {
      return ctx.forbidden();
    }
    const query = ctx.query as Record<string, unknown>;
    const {
      medusa_product_id: productId,
      source_url: sourceUrl,
      status,
    } = query;
    if (
      Object.keys(query).some(
        (key) => !["medusa_product_id", "source_url", "status"].includes(key),
      ) ||
      typeof productId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(productId) ||
      typeof sourceUrl !== "string" ||
      sourceUrl.length > 2048 ||
      (status !== "draft" && status !== "published")
    ) {
      return ctx.badRequest(
        "An exact product, HTTPS source URL and draft/published status are required.",
      );
    }
    let source: URL;
    try {
      source = new URL(sourceUrl);
    } catch {
      return ctx.badRequest("Invalid source URL.");
    }
    if (source.protocol !== "https:" || source.username || source.password) {
      return ctx.badRequest("Invalid source URL.");
    }
    // Two identities are enough to signal ambiguity; no caller-controlled
    // fields, population, pagination or broad private-content queries.
    const records = await strapi.documents(uid).findMany({
      filters: {
        medusa_product_id: { $eq: productId },
        source_url: { $eq: sourceUrl },
      },
      status,
      limit: 2,
      fields: ["medusa_product_id", "source_url"],
    });
    return {
      data: records.map((record) => ({
        documentId: record.documentId,
        medusa_product_id: record.medusa_product_id,
        source_url: record.source_url,
      })),
    };
  },
}));
