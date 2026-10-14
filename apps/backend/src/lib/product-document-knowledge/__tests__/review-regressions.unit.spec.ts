import { readPublicProductDocuments } from "../../../modules/strapi/public-product-documents";
import { normalizeStrapiProductDocument } from "../../../modules/product-files/utils/public-documents";
import { reconcileProductDocuments } from "../synchronize";
import { retrieveProductKnowledge } from "../retrieve";
import { PUBLIC_KNOWLEDGE_INDEX_SETTINGS } from "../synchronize";
import {
  approved,
  approvedKnowledgeDocument,
  knowledgeRevision,
  now,
  product,
} from "../../knowledge-reference/__tests__/fixtures";
import type { DocumentReadOptions } from "../contract";

function searchService() {
  return {
    configureIndex: jest.fn(),
    indexData: jest.fn(),
    deleteFromIndex: jest.fn(),
    listDocumentIds: jest.fn<Promise<string[]>, []>(),
    search: jest.fn(),
  };
}

it("preserves the old index when publication changes between pages without changing counts or repeating IDs", async () => {
  const raw = Array.from({ length: 51 }, (_, index) => ({
    ...approved(),
    documentId: `doc_${index + 1}`,
    title: `Manual ${String(index + 1).padStart(2, "0")}`,
  }));
  let stable = false;
  const live = raw.slice(1); // doc_1 withdrawn, doc_51 published: total remains 50.
  const request = jest.fn(async (endpoint: string) => {
    const url = new URL(endpoint, "https://fixture.invalid/");
    const id = url.searchParams.get("filters[documentId][$eq]");
    const page = Number(url.searchParams.get("pagination[page]"));
    const rows = id
      ? live.filter((row) => row.documentId === id)
      : !stable && page === 1
        ? raw.slice(0, 25)
        : live.slice((page - 1) * 25, page * 25);
    const total = id ? rows.length : 50;
    return {
      data: rows,
      meta: {
        pagination: {
          page,
          pageSize: 25,
          pageCount: Math.ceil(total / 25),
          total,
        },
      },
    };
  });
  const strapi = {
    listProductDocuments: (_productId?: string, scope?: DocumentReadOptions) =>
      readPublicProductDocuments(request, undefined, scope),
    getKnowledgeReference: jest.fn(),
  };
  const meilisearch = searchService();
  meilisearch.listDocumentIds.mockResolvedValue(
    raw.slice(0, 50).map((row) => row.documentId),
  );
  const options = { strapi, meilisearch, query: { graph: jest.fn() }, now };

  await expect(reconcileProductDocuments(options)).rejects.toThrow(
    /snapshot|changed/i,
  );
  expect(request).toHaveBeenCalledWith(
    expect.stringContaining("filters[documentId][$eq]=doc_26"),
  );
  expect(meilisearch.configureIndex).not.toHaveBeenCalled();
  expect(meilisearch.indexData).not.toHaveBeenCalled();
  expect(meilisearch.deleteFromIndex).not.toHaveBeenCalled();

  stable = true;
  await expect(reconcileProductDocuments(options)).resolves.toMatchObject({
    indexed: 50,
    deleted: 1,
  });
  expect(meilisearch.deleteFromIndex).toHaveBeenCalledWith(
    ["doc_1"],
    "product_document",
  );
  expect(meilisearch.indexData.mock.calls[0][0]).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: "doc_26" })]),
  );
});

it.each(["timeout", "outage", "malformed", "stillPublished", "wrongScope"])(
  "does not mutate the old index when missing-ID verification returns %s",
  async (reason) => {
    const current = normalizeStrapiProductDocument(approved());
    const strapi = {
      listProductDocuments: jest.fn(
        async (_productId?: string, scope?: DocumentReadOptions) => {
          if (!scope?.documentId) return [];
          if (reason === "timeout" || reason === "outage")
            throw new Error(reason);
          if (reason === "malformed") return null;
          return [
            {
              ...current,
              id: reason === "wrongScope" ? "doc_unrelated" : scope.documentId,
            },
          ];
        },
      ),
      getKnowledgeReference: jest.fn(),
    };
    const meilisearch = searchService();
    meilisearch.listDocumentIds.mockResolvedValue(["doc_missing"]);
    await expect(
      reconcileProductDocuments({
        // Deliberately invalid CMS response exercises the runtime trust boundary.
        strapi: strapi as never,
        meilisearch,
        query: { graph: jest.fn() },
        now,
      }),
    ).rejects.toThrow();
    expect(strapi.listProductDocuments).toHaveBeenCalledWith(undefined, {
      includeKnowledge: true,
      documentId: "doc_missing",
    });
    expect(meilisearch.configureIndex).not.toHaveBeenCalled();
    expect(meilisearch.indexData).not.toHaveBeenCalled();
    expect(meilisearch.deleteFromIndex).not.toHaveBeenCalled();
  },
);

it("checks every missing indexed identity for current absence before any mutation", async () => {
  const list = jest.fn(async () => []);
  const meilisearch = searchService();
  meilisearch.listDocumentIds.mockResolvedValue(["doc_one", "doc_two"]);
  await expect(
    reconcileProductDocuments({
      strapi: { listProductDocuments: list, getKnowledgeReference: jest.fn() },
      meilisearch,
      query: { graph: jest.fn() },
      now,
    }),
  ).resolves.toEqual({ indexed: 0, deleted: 2, knowledge_indexed: 0 });
  for (const id of ["doc_one", "doc_two"])
    expect(list).toHaveBeenCalledWith(undefined, {
      includeKnowledge: true,
      documentId: id,
    });
  expect(Math.max(...list.mock.invocationCallOrder)).toBeLessThan(
    meilisearch.configureIndex.mock.invocationCallOrder[0],
  );
  expect(meilisearch.deleteFromIndex).toHaveBeenCalledWith(
    ["doc_one", "doc_two"],
    "product_document",
  );
});

it.each([
  "duplicate",
  "unsafeId",
  "oversizedIndex",
  "oversizedWithdrawal",
  "indexOutage",
])("preserves the old index when its identity read is %s", async (reason) => {
  const meilisearch = searchService();
  if (reason === "indexOutage")
    meilisearch.listDocumentIds.mockRejectedValue(
      new Error("index unavailable"),
    );
  else
    meilisearch.listDocumentIds.mockResolvedValue(
      reason === "duplicate"
        ? ["doc_one", "doc_one"]
        : reason === "unsafeId"
          ? ['bad"identity']
          : Array.from(
              { length: reason === "oversizedIndex" ? 20_001 : 2001 },
              (_, index) => `doc_${index}`,
            ),
    );
  const list = jest.fn(async () => []);
  await expect(
    reconcileProductDocuments({
      strapi: { listProductDocuments: list, getKnowledgeReference: jest.fn() },
      meilisearch,
      query: { graph: jest.fn() },
      now,
    }),
  ).rejects.toThrow();
  expect(list).toHaveBeenCalledTimes(1);
  expect(meilisearch.configureIndex).not.toHaveBeenCalled();
  expect(meilisearch.indexData).not.toHaveBeenCalled();
  expect(meilisearch.deleteFromIndex).not.toHaveBeenCalled();
});

function saturatedSearch() {
  const records = ["expired", "withdrawn", "current_a", "current_b"].map(
    (state, index) => {
      const record = approved();
      record.documentId = `doc_${state}`;
      record.knowledge_content.variant_id =
        index === 3 ? "variant_b" : "variant_hotend";
      record.knowledge_review.document_id = record.documentId;
      record.knowledge_review.variant_id = record.knowledge_content.variant_id;
      record.knowledge_review.revision_hash = knowledgeRevision(record)!;
      return approvedKnowledgeDocument(record, now)!;
    },
  );
  type Hit = Record<string, string | null>;
  const ranked: Hit[] = [
    ...Array.from({ length: 8 }, (_, index) => ({
      id: `metadata_${index}`,
      medusa_product_id: "prod_hotend",
    })),
    ...records.map((record) => ({
      id: record.document_id,
      medusa_product_id: record.product_id,
      knowledge_variant_id: record.variant_id,
      knowledge_revision_hash: record.revision_hash,
    })),
  ];
  const meilisearch = searchService();
  meilisearch.search.mockImplementation(
    async (
      _term: string,
      _type: string,
      options: { filter?: string[]; limit: number },
    ) => {
      let hits = ranked;
      for (const filter of options.filter ?? []) {
        if (filter === "knowledge_revision_hash EXISTS")
          hits = hits.filter((hit) => "knowledge_revision_hash" in hit);
        else if (filter.startsWith("(knowledge_binding_scope")) {
          const variant = /knowledge_variant_id = "([^"]+)"/.exec(filter)![1];
          hits = hits.filter(
            (hit) =>
              hit.knowledge_binding_scope === "product" ||
              hit.knowledge_variant_id === variant,
          );
        } else {
          const match =
            /^(medusa_product_id|knowledge_variant_id) = "([^"]+)"$/.exec(
              filter,
            );
          if (!match) throw new Error("Unexpected fixture filter");
          hits = hits.filter((hit) => hit[match[1]] === match[2]);
        }
      }
      return { hits: hits.slice(0, options.limit) };
    },
  );
  const strapi = {
    listProductDocuments: jest.fn(),
    getKnowledgeReference: jest.fn(async (id: string) => {
      const record = records.find((record) => record.document_id === id);
      if (!record || id === "doc_withdrawn") return null;
      return id === "doc_expired"
        ? { ...record, valid_until: "2026-10-08T11:00:00Z" }
        : record;
    }),
  };
  const query = {
    graph: jest.fn().mockResolvedValue({
      data: [
        {
          ...product(),
          status: "published",
          variants: [{ id: "variant_hotend" }, { id: "variant_b" }],
        },
      ],
      metadata: { count: 1 },
    }),
  };
  return { meilisearch, strapi, query, now };
}

it("searches knowledge candidates before the eight-hit bound, then rechecks expiry and withdrawal", async () => {
  const options = saturatedSearch();
  const result = await retrieveProductKnowledge({
    ...options,
    queryText: "manual",
  });
  expect(result.documents.map((record) => record.document_id)).toEqual([
    "doc_current_a",
    "doc_current_b",
  ]);
  expect(options.meilisearch.search).toHaveBeenCalledWith(
    "manual",
    "product_document",
    { limit: 8, filter: ["knowledge_revision_hash EXISTS"] },
  );
  expect(PUBLIC_KNOWLEDGE_INDEX_SETTINGS.filterableAttributes).toContain(
    "knowledge_variant_id",
  );
  expect(options.strapi.getKnowledgeReference).toHaveBeenCalledTimes(4);
  expect(result.citations.map((citation) => citation.variant_id)).toEqual([
    "variant_hotend",
    "variant_b",
  ]);
});

it("combines knowledge eligibility with exact product and variant filters under metadata saturation", async () => {
  const options = saturatedSearch();
  options.query.graph.mockResolvedValueOnce({
    data: [
      { id: "variant_b", product: { id: "prod_hotend", status: "published" } },
    ],
    metadata: { count: 1 },
  });
  const result = await retrieveProductKnowledge({
    ...options,
    queryText: "manual",
    productId: "prod_hotend",
    variantId: "variant_b",
  });
  expect(result.documents.map((record) => record.document_id)).toEqual([
    "doc_current_b",
  ]);
  expect(options.meilisearch.search.mock.calls[0][2].filter).toEqual([
    "knowledge_revision_hash EXISTS",
    'medusa_product_id = "prod_hotend"',
    '(knowledge_binding_scope = "product" OR knowledge_variant_id = "variant_b")',
  ]);
  expect(options.strapi.getKnowledgeReference).toHaveBeenCalledTimes(1);
});
