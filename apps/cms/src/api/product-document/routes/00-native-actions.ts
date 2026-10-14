// Full-access Content API tokens use existing authentication; no anonymous mutation route.
const auth = (action: string) => ({
  strategies: ["content-api-token"],
  scope: [`api::product-document.product-document.${action}`],
});
export default {
  routes: [
    {
      method: "GET",
      path: "/product-documents/:documentId/review",
      handler: "api::product-document.product-document.reviewPreview",
      config: { auth: auth("reviewPreview") },
    },
    {
      method: "PUT",
      path: "/product-documents/import-upsert",
      handler: "api::product-document.product-document.importUpsert",
      config: { auth: auth("importUpsert") },
    },
    {
      method: "POST",
      path: "/product-documents/:documentId/review",
      handler: "api::product-document.product-document.reviewKnowledge",
      config: { auth: auth("reviewKnowledge") },
    },
  ],
};
