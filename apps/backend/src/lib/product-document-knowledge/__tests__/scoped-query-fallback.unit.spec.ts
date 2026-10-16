import { retrieveProductKnowledge } from "../retrieve";
import {
  approved,
  approvedKnowledgeDocument,
  now,
  product,
} from "../../knowledge-reference/__tests__/fixtures";

function fixture() {
  const document = approvedKnowledgeDocument(approved(), now)!;
  const candidate = {
    id: document.document_id,
    medusa_product_id: document.product_id,
    knowledge_variant_id: document.variant_id,
    knowledge_revision_hash: document.revision_hash,
    knowledge_text: "Untrusted indexed answer",
  };
  const nativeProduct = { ...product(), status: "published" };
  const meilisearch = {
    search: jest
      .fn()
      .mockResolvedValueOnce({ hits: [] })
      .mockResolvedValue({ hits: [candidate] }),
    configureIndex: jest.fn(),
    indexData: jest.fn(),
    listDocumentIds: jest.fn(),
    deleteFromIndex: jest.fn(),
  };
  const strapi = {
    getKnowledgeReference: jest.fn().mockResolvedValue(document),
    listProductDocuments: jest.fn(),
  };
  const query = {
    graph: jest.fn(async (input: Record<string, unknown>) =>
      input.entity === "product_variant"
        ? {
            data: [
              {
                id: "variant_hotend",
                product: { id: "prod_hotend", status: "published" },
              },
            ],
            metadata: { count: 1 },
          }
        : { data: [nativeProduct], metadata: { count: 1 } },
    ),
  };
  return {
    document,
    candidate,
    nativeProduct,
    meilisearch,
    strapi,
    query,
    now,
  };
}
const queryText =
  "Which materials does this model support? Cite the manufacturer.";

describe("bounded discovery after a scoped lexical miss", () => {
  it.each([
    "Which materials does Magigoo Original support on glass build plates? Cite the manufacturer.",
    "What is the Dragonfly BMS mainly made from? Cite its source.",
  ])(
    "returns current scoped evidence when natural-language search has no hits: %s",
    async (question) => {
      const options = fixture();
      const result = await retrieveProductKnowledge({
        ...options,
        queryText: question,
        productId: "prod_hotend",
      });
      expect(result.documents).toEqual([options.document]);
      expect(result.citations[0]).toMatchObject({
        document_id: options.document.document_id,
        revision_hash: options.document.revision_hash,
        source_url: options.document.source_url,
      });
      expect(result.documents[0].facts[1]).toMatchObject({
        value: null,
        evidence_excerpt: "",
      });
      expect(JSON.stringify(result)).not.toContain("Untrusted indexed answer");
      const params = {
        limit: 8,
        filter: [
          "knowledge_revision_hash EXISTS",
          'medusa_product_id = "prod_hotend"',
        ],
      };
      expect(options.meilisearch.search.mock.calls).toEqual([
        [question, "product_document", params],
        ["", "product_document", params],
      ]);
      expect(options.strapi.getKnowledgeReference).toHaveBeenCalledWith(
        options.document.document_id,
        "prod_hotend",
        options.document.revision_hash,
      );
      expect(options.meilisearch.configureIndex).not.toHaveBeenCalled();
      expect(options.meilisearch.indexData).not.toHaveBeenCalled();
      expect(options.meilisearch.deleteFromIndex).not.toHaveBeenCalled();
    },
  );
  it("retains exact variant and verified owner filters in both requests", async () => {
    const options = fixture();
    const result = await retrieveProductKnowledge({
      ...options,
      queryText,
      variantId: "variant_hotend",
    });
    expect(result.documents).toEqual([options.document]);
    for (const call of options.meilisearch.search.mock.calls)
      expect(call[2]).toEqual({
        limit: 8,
        filter: [
          "knowledge_revision_hash EXISTS",
          'medusa_product_id = "prod_hotend"',
          '(knowledge_binding_scope = "product" OR knowledge_variant_id = "variant_hotend")',
        ],
      });
    expect(options.meilisearch.search).toHaveBeenCalledTimes(2);
  });
  it("never performs an unscoped placeholder search", async () => {
    const options = fixture();
    expect(await retrieveProductKnowledge({ ...options, queryText })).toEqual({
      documents: [],
      citations: [],
    });
    expect(options.meilisearch.search).toHaveBeenCalledTimes(1);
    expect(options.strapi.getKnowledgeReference).not.toHaveBeenCalled();
  });
  it("preserves successful lexical discovery without an extra request", async () => {
    const options = fixture();
    options.meilisearch.search
      .mockReset()
      .mockResolvedValue({ hits: [options.candidate] });
    expect(
      (
        await retrieveProductKnowledge({
          ...options,
          queryText,
          productId: "prod_hotend",
        })
      ).documents,
    ).toEqual([options.document]);
    expect(options.meilisearch.search).toHaveBeenCalledTimes(1);
  });
  it("does not retry a failed search", async () => {
    const options = fixture();
    options.meilisearch.search
      .mockReset()
      .mockRejectedValue(new Error("search unavailable"));
    await expect(
      retrieveProductKnowledge({
        ...options,
        queryText,
        productId: "prod_hotend",
      }),
    ).rejects.toThrow("search unavailable");
    expect(options.meilisearch.search).toHaveBeenCalledTimes(1);
  });
  it.each([{ hits: null }, { hits: Array(9).fill({}) }])(
    "rejects malformed or excessive initial hits before fallback (%j)",
    async (result) => {
      const options = fixture();
      options.meilisearch.search.mockReset().mockResolvedValue(result);
      await expect(
        retrieveProductKnowledge({
          ...options,
          queryText,
          productId: "prod_hotend",
        }),
      ).rejects.toThrow("Invalid document search response");
      expect(options.meilisearch.search).toHaveBeenCalledTimes(1);
      expect(options.strapi.getKnowledgeReference).not.toHaveBeenCalled();
    },
  );
  it.each([{ hits: null }, { hits: Array(9).fill({}) }])(
    "applies the same candidate bound to fallback (%j)",
    async (result) => {
      const options = fixture();
      options.meilisearch.search
        .mockReset()
        .mockResolvedValueOnce({ hits: [] })
        .mockResolvedValue(result);
      await expect(
        retrieveProductKnowledge({
          ...options,
          queryText,
          productId: "prod_hotend",
        }),
      ).rejects.toThrow("Invalid document search response");
      expect(options.meilisearch.search).toHaveBeenCalledTimes(2);
      expect(options.strapi.getKnowledgeReference).not.toHaveBeenCalled();
    },
  );
  it("stops after one empty scoped fallback", async () => {
    const options = fixture();
    options.meilisearch.search.mockReset().mockResolvedValue({ hits: [] });
    expect(
      await retrieveProductKnowledge({
        ...options,
        queryText,
        productId: "prod_hotend",
      }),
    ).toEqual({ documents: [], citations: [] });
    expect(options.meilisearch.search).toHaveBeenCalledTimes(2);
    expect(options.strapi.getKnowledgeReference).not.toHaveBeenCalled();
  });
  it("propagates fallback transport errors without another attempt", async () => {
    const options = fixture();
    options.meilisearch.search
      .mockReset()
      .mockResolvedValueOnce({ hits: [] })
      .mockRejectedValue(new Error("fallback unavailable"));
    await expect(
      retrieveProductKnowledge({
        ...options,
        queryText,
        productId: "prod_hotend",
      }),
    ).rejects.toThrow("fallback unavailable");
    expect(options.meilisearch.search).toHaveBeenCalledTimes(2);
  });
  it.each([
    "expired",
    "changed-text",
    "changed-revision",
    "unpublished-document",
    "unpublished-product",
  ])("revalidates %s after fallback", async (reason) => {
    const options = fixture();
    if (reason === "expired")
      options.document.valid_until = "2026-10-07T00:00:00Z";
    if (reason === "changed-text") options.document.text += "Unreviewed text";
    if (reason === "changed-revision")
      options.candidate.knowledge_revision_hash = "b".repeat(64);
    if (reason === "unpublished-document")
      options.strapi.getKnowledgeReference.mockResolvedValue(null);
    if (reason === "unpublished-product")
      options.nativeProduct.status = "draft";
    expect(
      await retrieveProductKnowledge({
        ...options,
        queryText,
        productId: "prod_hotend",
      }),
    ).toEqual({ documents: [], citations: [] });
    expect(options.meilisearch.search).toHaveBeenCalledTimes(2);
  });
  it.each(["wrong-product", "wrong-variant", "metadata-only"])(
    "rejects a %s fallback candidate without source reads",
    async (reason) => {
      const options = fixture();
      const candidate = {
        ...options.candidate,
        ...(reason === "wrong-product"
          ? { medusa_product_id: "prod_other" }
          : {}),
        ...(reason === "wrong-variant"
          ? { knowledge_variant_id: "variant_other" }
          : {}),
        ...(reason === "metadata-only"
          ? { knowledge_revision_hash: undefined }
          : {}),
      };
      options.meilisearch.search
        .mockReset()
        .mockResolvedValueOnce({ hits: [] })
        .mockResolvedValue({ hits: [candidate] });
      expect(
        await retrieveProductKnowledge({
          ...options,
          queryText,
          variantId: "variant_hotend",
        }),
      ).toEqual({ documents: [], citations: [] });
      expect(options.meilisearch.search).toHaveBeenCalledTimes(2);
      expect(options.strapi.getKnowledgeReference).not.toHaveBeenCalled();
    },
  );
  it("does not broaden a nonempty result whose candidates fail validation", async () => {
    const options = fixture();
    options.meilisearch.search
      .mockReset()
      .mockResolvedValue({ hits: [{ id: "metadata_only" }] });
    expect(
      await retrieveProductKnowledge({
        ...options,
        queryText,
        productId: "prod_hotend",
      }),
    ).toEqual({ documents: [], citations: [] });
    expect(options.meilisearch.search).toHaveBeenCalledTimes(1);
  });
  it("does not search when the requested product conflicts with variant ownership", async () => {
    const options = fixture();
    expect(
      await retrieveProductKnowledge({
        ...options,
        queryText,
        productId: "prod_other",
        variantId: "variant_hotend",
      }),
    ).toEqual({ documents: [], citations: [] });
    expect(options.meilisearch.search).not.toHaveBeenCalled();
  });
});
