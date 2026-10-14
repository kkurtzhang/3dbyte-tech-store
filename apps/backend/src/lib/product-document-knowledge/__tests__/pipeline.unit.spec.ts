import {
  approved,
  approvedKnowledgeDocument,
  knowledgeRevision,
  now,
  product,
} from "../../knowledge-reference/__tests__/fixtures";
import { normalizeStrapiProductDocument } from "../../../modules/product-files/utils/public-documents";
import { reconcileProductDocuments } from "../synchronize";
import { retrieveProductKnowledge } from "../retrieve";

function setup() {
  const native = approved();
  const second = approved();
  second.documentId = "doc_second";
  second.knowledge_review.document_id = second.documentId;
  second.knowledge_content.variant_id = "variant_second";
  second.knowledge_review.variant_id = "variant_second";
  second.knowledge_review.revision_hash = knowledgeRevision(second)!;
  const documents = [native, second].map((record) => ({
    ...normalizeStrapiProductDocument(record),
    approved_knowledge: approvedKnowledgeDocument(record, now),
  }));
  const nativeProduct = {
    ...product(),
    status: "published",
    variants: [
      { id: "variant_hotend", prices: [{ amount: 100 }] },
      { id: "variant_second", prices: [{ amount: 200 }] },
    ],
  };
  const strapi = {
    listProductDocuments: jest.fn(
      async (_productId?: string, scope?: { documentId?: string }) =>
        scope?.documentId
          ? documents.filter((document) => document.id === scope.documentId)
          : documents,
    ),
    getKnowledgeReference: jest.fn(
      async (id: string) =>
        documents.find((d) => d.id === id)?.approved_knowledge ?? null,
    ),
  };
  const query = {
    graph: jest
      .fn()
      .mockResolvedValue({ data: [nativeProduct], metadata: { count: 1 } }),
  };
  const meilisearch = {
    configureIndex: jest.fn(),
    indexData: jest.fn(),
    listDocumentIds: jest
      .fn()
      .mockResolvedValue(["doc_hotend", "doc_withdrawn"]),
    deleteFromIndex: jest.fn(),
    search: jest.fn().mockResolvedValue({
      hits: documents.map((d) => ({
        id: d.id,
        medusa_product_id: d.medusa_product_id,
        knowledge_variant_id: d.approved_knowledge!.variant_id,
        knowledge_revision_hash: d.approved_knowledge!.revision_hash,
        knowledge_text: "Untrusted cached answer",
      })),
    }),
  };
  return {
    options: { strapi, query, meilisearch, now },
    documents,
    nativeProduct,
    strapi,
    query,
    meilisearch,
  };
}

describe("one reusable public document index", () => {
  it("indexes multiple approved documents for an ordinary priced multi-variant product", async () => {
    const { options, meilisearch, strapi } = setup();
    expect(await reconcileProductDocuments(options)).toEqual({
      indexed: 2,
      deleted: 1,
      knowledge_indexed: 2,
    });
    expect(strapi.listProductDocuments).toHaveBeenCalledWith(undefined, {
      includeKnowledge: true,
    });
    const [records, type] = meilisearch.indexData.mock.calls[0];
    expect(type).toBe("product_document");
    expect(records.map((r: { id: string }) => r.id)).toEqual([
      "doc_hotend",
      "doc_second",
    ]);
    expect(records[0]).toMatchObject({
      title: "Manufacturer reference",
      public_download_path: "/store/product-documents/doc_hotend/download",
      knowledge_text: "Compatible with Printer One.",
    });
    expect(JSON.stringify(records)).not.toMatch(
      /knowledge_review|reviewed_at|knowledge_content|price|inventory|Untrusted cached/,
    );
    expect(meilisearch.deleteFromIndex).toHaveBeenCalledWith(
      ["doc_withdrawn"],
      "product_document",
    );
  });

  it.each(["expired", "changed", "variant", "draftProduct", "noApproval"])(
    "keeps metadata discovery but strips %s knowledge",
    async (reason) => {
      const { options, documents, nativeProduct, meilisearch } = setup();
      for (const d of documents) {
        if (reason === "expired")
          d.approved_knowledge!.valid_until = "2026-10-08T11:00:00Z";
        if (reason === "changed") d.approved_knowledge!.text += "Unreviewed";
        if (reason === "variant")
          d.approved_knowledge!.variant_id = "variant_not_in_product";
        if (reason === "noApproval") d.approved_knowledge = null;
      }
      if (reason === "draftProduct") nativeProduct.status = "draft";
      expect(await reconcileProductDocuments(options)).toMatchObject({
        indexed: 2,
        knowledge_indexed: 0,
      });
      for (const d of meilisearch.indexData.mock.calls[0][0]) {
        expect(d).not.toHaveProperty("knowledge_text");
        expect(d).toHaveProperty("public_download_path");
      }
    },
  );

  it.each(["cmsFailure", "partialProducts", "repeatedDocument"])(
    "aborts %s before index mutation",
    async (reason) => {
      const { options, documents, query, strapi, meilisearch } = setup();
      if (reason === "cmsFailure")
        strapi.listProductDocuments.mockRejectedValue(
          new Error("Incomplete CMS snapshot"),
        );
      if (reason === "partialProducts")
        query.graph.mockResolvedValue({ data: [], metadata: { count: 1 } });
      if (reason === "repeatedDocument") documents.push(documents[0]);
      await expect(reconcileProductDocuments(options)).rejects.toThrow();
      expect(meilisearch.configureIndex).not.toHaveBeenCalled();
      expect(meilisearch.indexData).not.toHaveBeenCalled();
      expect(meilisearch.deleteFromIndex).not.toHaveBeenCalled();
    },
  );

  it("scopes a withdrawal to its exact document, never deletes CMS or Medusa records", async () => {
    const { options, strapi, meilisearch } = setup();
    strapi.listProductDocuments.mockResolvedValue([]);
    expect(
      await reconcileProductDocuments({ ...options, documentId: "doc_hotend" }),
    ).toEqual({ indexed: 0, deleted: 1, knowledge_indexed: 0 });
    expect(strapi.listProductDocuments).toHaveBeenCalledWith(undefined, {
      includeKnowledge: true,
      documentId: "doc_hotend",
    });
    expect(meilisearch.deleteFromIndex).toHaveBeenCalledWith(
      ["doc_hotend"],
      "product_document",
    );
    expect(meilisearch.listDocumentIds).not.toHaveBeenCalled();
  });

  it("recovers missed events through repeatable full reconciliation, including an empty library", async () => {
    const { options, strapi, meilisearch } = setup();
    await reconcileProductDocuments(options);
    await reconcileProductDocuments(options);
    strapi.listProductDocuments.mockResolvedValue([]);
    expect(await reconcileProductDocuments(options)).toEqual({
      indexed: 0,
      deleted: 2,
      knowledge_indexed: 0,
    });
    expect(meilisearch.deleteFromIndex).toHaveBeenLastCalledWith(
      ["doc_hotend", "doc_withdrawn"],
      "product_document",
    );
  });
});

describe("authoritative knowledge retrieval", () => {
  it("returns current cited facts with exact variant scope and honest unknowns", async () => {
    const { options, meilisearch } = setup();
    const result = await retrieveProductKnowledge({
      ...options,
      queryText: "Printer One",
      limit: 4,
    });
    expect(result.documents).toHaveLength(2);
    expect(result.documents[0].facts[1]).toMatchObject({
      value: null,
      evidence_excerpt: "",
    });
    expect(result.documents.map((d) => d.variant_id)).toEqual([
      "variant_hotend",
      "variant_second",
    ]);
    expect(result.citations[0]).toMatchObject({
      document_id: "doc_hotend",
      source_url: "https://manufacturer.example/hotend",
    });
    expect(meilisearch.search.mock.calls[0][1]).toBe("product_document");
    expect(JSON.stringify(result)).not.toMatch(
      /Untrusted cached|knowledge_review|reviewed_at|prices|inventory/,
    );
  });

  it.each([
    "expired",
    "oldIndex",
    "unpublishedDocument",
    "wrongBinding",
    "unpublishedProduct",
  ])("rejects %s without waiting for index cleanup", async (reason) => {
    const { options, documents, nativeProduct, strapi, meilisearch } = setup();
    if (reason === "expired")
      documents.forEach(
        (d) => (d.approved_knowledge!.valid_until = "2026-10-08T11:00:00Z"),
      );
    if (reason === "oldIndex")
      meilisearch.search.mockResolvedValue({
        hits: [
          {
            id: "doc_hotend",
            medusa_product_id: "prod_hotend",
            knowledge_variant_id: "variant_hotend",
            knowledge_revision_hash: "b".repeat(64),
          },
        ],
      });
    if (reason === "unpublishedDocument")
      strapi.getKnowledgeReference.mockResolvedValue(null);
    if (reason === "wrongBinding") nativeProduct.variants = [];
    if (reason === "unpublishedProduct") nativeProduct.status = "draft";
    expect(
      await retrieveProductKnowledge({ ...options, queryText: "Printer One" }),
    ).toEqual({ documents: [], citations: [] });
  });

  it("honors exact requested product/variant even if search returns an unrelated candidate", async () => {
    const { options } = setup();
    const result = await retrieveProductKnowledge({
      ...options,
      queryText: "Printer One",
      productId: "prod_hotend",
      variantId: "variant_second",
    });
    expect(result.documents.map((d) => d.variant_id)).toEqual([
      "variant_second",
    ]);
  });

  it.each(["", "x".repeat(121)])(
    "rejects an invalid query before service access",
    async (queryText) => {
      const { options, meilisearch } = setup();
      await expect(
        retrieveProductKnowledge({ ...options, queryText }),
      ).rejects.toThrow();
      expect(meilisearch.search).not.toHaveBeenCalled();
    },
  );

  it("rejects excess search candidates instead of doing unbounded native reads", async () => {
    const { options, meilisearch, strapi } = setup();
    meilisearch.search.mockResolvedValue({ hits: Array(9).fill({}) });
    await expect(
      retrieveProductKnowledge({ ...options, queryText: "Printer" }),
    ).rejects.toThrow();
    expect(strapi.getKnowledgeReference).not.toHaveBeenCalled();
  });
});
