/**
 * collection controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::collection.collection",
  ({ strapi }) => ({
    async unpublish(ctx) {
      const { documentId } = ctx.params;

      if (!documentId || typeof documentId !== "string") {
        return ctx.badRequest("documentId is required");
      }

      const result = await strapi
        .service("api::collection.collection")
        .unpublish(documentId);

      ctx.body = {
        data: result,
      };
    },
  }),
);
