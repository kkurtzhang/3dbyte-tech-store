// Load before the core /:documentId route. This is not a public read endpoint.
export default {
  routes: [{
    method: "GET",
    path: "/product-documents/import-lookup",
    handler: "api::product-document.product-document.importLookup",
    config: {
      auth: {
        strategies: ["content-api-token"],
        scope: ["api::product-document.product-document.importLookup"],
      },
    },
  }],
};
