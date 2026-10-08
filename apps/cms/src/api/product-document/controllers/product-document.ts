/**
 * product-document controller
 */

import { factories } from "@strapi/strapi";
import {
  knowledgeIdentifier,
  knowledgeDigest,
} from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
import { approvedKnowledgeDocument } from "../utils/knowledge-reference";

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

export default factories.createCoreController(uid, ({ strapi }) => ({
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
    const records = await strapi
      .documents(uid)
      .findMany({
        status: "published",
        filters: {
          documentId: { $eq: ctx.params.documentId },
          medusa_product_id: { $eq: productId },
          is_public: { $eq: true },
        },
        limit: 2,
      });
    const document =
      records.length === 1 ? approvedKnowledgeDocument(records[0]) : null;
    // Publish only the approved whitelisted DTO, never the private native record.
    return document && document.revision_hash === revision
      ? { data: document }
      : ctx.notFound();
  },
  async find(ctx) {
    ctx.query = publicQuery(ctx.query);
    return super.find(ctx);
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
