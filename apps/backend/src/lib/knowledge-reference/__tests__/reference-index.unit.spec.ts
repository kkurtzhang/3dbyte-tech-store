import {
  reconcileReferenceIndex,
  readIndexedReferencePage,
} from "../reference-index";
import { approved, approvedKnowledgeDocument, marked, now } from "./fixtures";

function setup() {
  const product = marked(),
    document = approvedKnowledgeDocument(approved(), now)!;
  const query = {
    graph: jest
      .fn()
      .mockResolvedValue({ data: [product], metadata: { count: 1 } }),
  };
  const strapi = {
    getKnowledgeReference: jest.fn().mockResolvedValue(document),
  };
  const hit = {
    id: product.id,
    product_id: product.id,
    variant_id: document.variant_id,
    document_id: document.document_id,
    revision_hash: document.revision_hash,
  };
  const meilisearch = {
    configureIndex: jest.fn().mockResolvedValue(undefined),
    indexData: jest.fn().mockResolvedValue(undefined),
    listDocumentIds: jest.fn().mockResolvedValue([product.id, "old_product"]),
    deleteFromIndex: jest.fn().mockResolvedValue(undefined),
    search: jest.fn().mockResolvedValue({ hits: [hit], estimatedTotalHits: 1 }),
  };
  return {
    product,
    document,
    hit,
    query,
    strapi,
    meilisearch,
    options: {
      query,
      strapi,
      meilisearch,
      productIds: [product.id],
      environment: "staging",
      now,
    },
  };
}
beforeEach(() => jest.spyOn(Date, "now").mockReturnValue(now));
afterEach(() => jest.restoreAllMocks());
describe("opt-in approved native reference index", () => {
  it("indexes only exact approved bound content without stock, prices or private reviews", async () => {
    const { options, meilisearch, query, product } = setup();
    expect(await reconcileReferenceIndex(options)).toEqual({
      indexed: 1,
      deleted: 1,
    });
    expect(query.graph).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { id: [product.id], status: "draft" },
      }),
    );
    const records = meilisearch.indexData.mock.calls[0][0];
    expect(records).toEqual([
      expect.objectContaining({
        product_id: product.id,
        text: "Compatible with Printer One.",
      }),
    ]);
    expect(JSON.stringify(records)).not.toMatch(
      /inventory|quantity|price|knowledge_review|reviewed_at/,
    );
    expect(meilisearch.deleteFromIndex).toHaveBeenCalledWith(
      ["old_product"],
      "knowledge_reference",
    );
  });
  it.each(["revision", "missingSource", "expired", "noMarker", "priced"])(
    "withdraws %s records instead of indexing unchecked facts",
    async (reason) => {
      const { options, strapi, product, document, meilisearch } = setup();
      if (reason === "revision") document.text += "changed";
      if (reason === "missingSource")
        strapi.getKnowledgeReference.mockResolvedValue(null);
      if (reason === "expired") document.valid_until = "2026-10-07T00:00:00Z";
      if (reason === "noMarker")
        delete (product.metadata as Record<string, unknown>)
          .catalogue_simulation;
      if (reason === "priced")
        product.variants[0].price_set.prices.push({ amount: 1 } as never);
      expect(await reconcileReferenceIndex(options)).toEqual({
        indexed: 0,
        deleted: 2,
      });
      expect(meilisearch.indexData).not.toHaveBeenCalled();
    },
  );
  it.each(
    [[], [""], Array(101).fill("product"), ["product", "product"]].map(
      (productIds) => ({ productIds }),
    ),
  )(
    "rejects an invalid explicit product scope before reads",
    async ({ productIds }) => {
      const { options, query } = setup();
      await expect(
        reconcileReferenceIndex({ ...options, productIds }),
      ).rejects.toThrow();
      expect(query.graph).not.toHaveBeenCalled();
    },
  );
  it("requires staging and aborts changing/partial catalogue snapshots before any index mutation", async () => {
    const { options, query, meilisearch } = setup();
    await expect(
      reconcileReferenceIndex({ ...options, environment: "production" }),
    ).rejects.toThrow();
    query.graph.mockResolvedValue({
      data: [options.query.graph.mock.results[0]],
      metadata: { count: 2 },
    });
    await expect(reconcileReferenceIndex(options)).rejects.toThrow(/snapshot/i);
    expect(meilisearch.configureIndex).not.toHaveBeenCalled();
  });
  it("aborts failed reads before any index mutation", async () => {
    const { options, query, meilisearch } = setup();
    query.graph.mockRejectedValue(new Error("fixture failure"));
    await expect(reconcileReferenceIndex(options)).rejects.toThrow();
    expect(meilisearch.deleteFromIndex).not.toHaveBeenCalled();
  });
  it("supports idempotent retries and removes unpublished/missing products", async () => {
    const { options, query, meilisearch } = setup();
    await reconcileReferenceIndex(options);
    await reconcileReferenceIndex(options);
    expect(meilisearch.indexData).toHaveBeenCalledTimes(2);
    query.graph.mockResolvedValue({ data: [], metadata: { count: 0 } });
    expect(await reconcileReferenceIndex(options)).toEqual({
      indexed: 0,
      deleted: 2,
    });
  });
});
describe("index discovery with authoritative native citation checks", () => {
  it("retrieves an index candidate then checks its exact live binding and native source", async () => {
    const { options, meilisearch, product } = setup();
    const result = await readIndexedReferencePage({
      ...options,
      term: "Printer One",
      offset: 0,
    });
    expect(meilisearch.search).toHaveBeenCalledWith(
      "Printer One",
      "knowledge_reference",
      { limit: 4, offset: 0 },
    );
    expect(result).toMatchObject({
      references: [
        {
          product_id: product.id,
          price: null,
          checkout_enabled: false,
          simulated_initial_quantity: 0,
        },
      ],
      next_offset: null,
    });
  });
  it.each([
    "oldIndex",
    "missingProduct",
    "missingSource",
    "expired",
    "newBinding",
  ])("fails closed for %s even before automatic cleanup", async (reason) => {
    const { options, hit, strapi, query, document, product } = setup();
    if (reason === "oldIndex") hit.revision_hash = "b".repeat(64);
    if (reason === "missingProduct")
      query.graph.mockResolvedValue({ data: [] });
    if (reason === "missingSource")
      strapi.getKnowledgeReference.mockResolvedValue(null);
    if (reason === "expired") document.valid_until = "2026-10-07T00:00:00Z";
    if (reason === "newBinding")
      product.metadata.knowledge_reference.revision_hash = "c".repeat(64);
    expect(
      await readIndexedReferencePage({
        ...options,
        term: "Printer One",
        offset: 0,
      }),
    ).toEqual({ references: [], next_offset: null });
  });
  it("preserves pagination while limiting native lookups to four", async () => {
    const { options, meilisearch, hit } = setup();
    meilisearch.search.mockResolvedValue({
      hits: [hit],
      estimatedTotalHits: 7,
    });
    expect(
      await readIndexedReferencePage({
        ...options,
        term: "Printer",
        offset: 4,
      }),
    ).toMatchObject({ next_offset: 5 });
  });
  it.each(["duplicate", "unsafeId", "tooMany", "invalidDigest"])(
    "rejects malformed %s index candidates",
    async (reason) => {
      const { options, meilisearch, hit } = setup();
      if (reason === "duplicate")
        meilisearch.search.mockResolvedValue({
          hits: [hit, hit],
          estimatedTotalHits: 2,
        });
      if (reason === "unsafeId") hit.product_id = "../escape";
      if (reason === "tooMany")
        meilisearch.search.mockResolvedValue({
          hits: Array(5).fill(hit),
          estimatedTotalHits: 5,
        });
      if (reason === "invalidDigest") hit.revision_hash = "wrong";
      await expect(
        readIndexedReferencePage({ ...options, term: "Printer", offset: 0 }),
      ).rejects.toThrow();
    },
  );
});
