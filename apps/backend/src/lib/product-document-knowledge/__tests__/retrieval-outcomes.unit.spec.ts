import { retrieveProductKnowledge } from "../retrieve";
import {
  approved,
  approvedKnowledgeDocument,
  now,
  product,
} from "../../knowledge-reference/__tests__/fixtures";

function setup() {
  const doc = approvedKnowledgeDocument(approved(), now)!;
  const candidate = {
    id: doc.document_id,
    medusa_product_id: doc.product_id,
    knowledge_variant_id: doc.variant_id,
    knowledge_revision_hash: doc.revision_hash,
  };
  return {
    now,
    doc,
    candidate,
    query: {
      graph: jest
        .fn()
        .mockResolvedValue({
          data: [{ ...product(), status: "published" }],
          metadata: { count: 1 },
        }),
    },
    meilisearch: {
      search: jest.fn().mockResolvedValue({ hits: [candidate] }),
      configureIndex: jest.fn(),
      indexData: jest.fn(),
      listDocumentIds: jest.fn(),
      deleteFromIndex: jest.fn(),
    },
    strapi: {
      getKnowledgeReference: jest.fn().mockResolvedValue(doc),
      listProductDocuments: jest.fn(),
    },
  };
}
it("reports an empty match separately from an expired or invalid matching document", async () => {
  const options = setup();
  options.meilisearch.search.mockResolvedValueOnce({ hits: [] });
  expect(
    await retrieveProductKnowledge({
      ...options,
      queryText: "Can I run this hotend at 500°C?",
    }),
  ).toEqual({ documents: [], citations: [], availability: "no_match" });
  options.doc.valid_until = new Date(now).toISOString();
  expect(
    await retrieveProductKnowledge({
      ...options,
      queryText: "Can I run this hotend at 500°C?",
    }),
  ).toEqual({ documents: [], citations: [], availability: "not_current" });
});
it("never discloses a rejected body or source and never uses indexed text as a substitute", async () => {
  const options = setup();
  options.strapi.getKnowledgeReference.mockResolvedValue(null);
  const result = await retrieveProductKnowledge({
    ...options,
    queryText: "Would it fit?",
  });
  expect(result).toEqual({
    documents: [],
    citations: [],
    availability: "not_current",
  });
  expect(JSON.stringify(result)).not.toContain(options.doc.source_url);
});
it("preserves transport errors as outages instead of an empty corpus", async () => {
  const options = setup();
  options.strapi.getKnowledgeReference.mockRejectedValue(
    new Error("source unavailable"),
  );
  await expect(
    retrieveProductKnowledge({ ...options, queryText: "What is it made of?" }),
  ).rejects.toThrow("source unavailable");
  expect(options.strapi.getKnowledgeReference).toHaveBeenCalledWith(
    options.doc.document_id,
    options.doc.product_id,
    options.doc.revision_hash,
    { failSoft: false },
  );
});
