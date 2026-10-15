import type { StrapiApp } from "@strapi/strapi/admin";
import type { ContentManagerPlugin } from "@strapi/content-manager/strapi-admin";
import { KnowledgeReviewAction } from "./knowledge-review/KnowledgeReviewAction";
export default {
  bootstrap(app: StrapiApp) {
    const apis = app.getPlugin("content-manager")
      .apis as ContentManagerPlugin["config"]["apis"];
    apis.addDocumentAction([KnowledgeReviewAction]);
  },
};
