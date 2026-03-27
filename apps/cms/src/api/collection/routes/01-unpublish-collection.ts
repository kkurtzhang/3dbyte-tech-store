import type { Core } from "@strapi/strapi";

const routes: Core.RouterConfig = {
  type: "content-api",
  routes: [
    {
      method: "POST",
      path: "/collections/:documentId/unpublish",
      handler: "api::collection.collection.unpublish",
    },
  ],
};

export default routes;
