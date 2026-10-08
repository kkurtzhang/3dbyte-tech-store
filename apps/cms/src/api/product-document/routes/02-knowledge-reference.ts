export default {
  routes: [
    {
      method: "GET",
      path: "/product-documents/:documentId/knowledge-reference",
      handler: "api::product-document.product-document.knowledgeReference",
      config: { auth: false },
    },
  ],
};
