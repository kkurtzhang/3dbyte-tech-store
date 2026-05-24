/**
 * product-document controller
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::product-document.product-document",
  () => ({
    async find(ctx) {
      const query = ctx.query as Record<string, unknown>;
      const filters =
        query.filters && typeof query.filters === "object"
          ? (query.filters as Record<string, unknown>)
          : {};

      ctx.query = {
        ...query,
        filters: {
          ...filters,
          is_public: {
            $eq: true,
          },
        },
      };

      return super.find(ctx);
    },
  }),
);
