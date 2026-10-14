import {
  reconcileProductDocuments,
  PUBLIC_KNOWLEDGE_INDEX_SETTINGS,
} from "../synchronize";

function fixture() {
  const rows = ["doc_a", "doc_b", "doc_unrelated"].map((id) => ({
    id,
    medusa_product_id: "prod_fixture",
    product_handle: "fixture",
    product_title: "Fixture",
    title: id,
    document_type: "manual",
    source_url: `https://example.com/${id}`,
    search_keywords: [],
    sort_order: 0,
    published_at: "2026-10-14T00:00:00Z",
  }));
  const state = new Map<string, Record<string, unknown>>([
    ["doc_a", { id: "doc_a", title: "old" }],
    ["doc_b", { id: "doc_b", title: "old" }],
    [
      "doc_unrelated",
      {
        id: "doc_unrelated",
        title: "preserve bytes",
        private_marker: "sentinel",
      },
    ],
    [
      "doc_orphan",
      { id: "doc_orphan", title: "preserve even if absent from CMS" },
    ],
  ]);
  const strapi = {
    listProductDocuments: jest.fn(
      async (_product?: string, options?: { documentId?: string }) =>
        options?.documentId
          ? rows.filter((r) => r.id === options.documentId)
          : rows,
    ),
    getKnowledgeReference: jest.fn(),
  };
  const meilisearch = {
    getIndexSettings: jest.fn(async () =>
      structuredClone(PUBLIC_KNOWLEDGE_INDEX_SETTINGS),
    ),
    configureIndex: jest.fn(),
    listDocumentIds: jest.fn(async () => [...state.keys()]),
    indexData: jest.fn(async (records: Record<string, unknown>[]) => {
      for (const r of records) state.set(r.id as string, r);
    }),
    deleteFromIndex: jest.fn(async (ids: string[]) => {
      for (const id of ids) state.delete(id);
    }),
    search: jest.fn(),
  };
  return {
    rows,
    state,
    strapi,
    meilisearch,
    query: { graph: jest.fn() },
    documentIds: ["doc_a", "doc_b"],
  };
}

it("syncs only the two explicit IDs and preserves unrelated and orphan index records and settings", async () => {
  const options = fixture();
  const before = ["doc_unrelated", "doc_orphan"].map((id) =>
    JSON.stringify(options.state.get(id)),
  );
  expect(await reconcileProductDocuments(options)).toEqual({
    indexed: 2,
    deleted: 0,
    knowledge_indexed: 0,
  });
  expect(options.strapi.listProductDocuments.mock.calls).toEqual([
    [undefined, { includeKnowledge: true, documentId: "doc_a" }],
    [undefined, { includeKnowledge: true, documentId: "doc_b" }],
  ]);
  expect(options.meilisearch.listDocumentIds).not.toHaveBeenCalled();
  expect(options.meilisearch.configureIndex).not.toHaveBeenCalled();
  expect(options.meilisearch.getIndexSettings).toHaveBeenCalledWith(
    "product_document",
  );
  expect(
    ["doc_unrelated", "doc_orphan"].map((id) =>
      JSON.stringify(options.state.get(id)),
    ),
  ).toEqual(before);
  expect(
    options.meilisearch.indexData.mock.calls[0][0].map((r) => r.id),
  ).toEqual(["doc_a", "doc_b"]);
});

it("withdraws only an explicitly requested ID confirmed absent by its exact authoritative read", async () => {
  const options = fixture();
  options.rows.splice(1, 1);
  expect(await reconcileProductDocuments(options)).toEqual({
    indexed: 1,
    deleted: 1,
    knowledge_indexed: 0,
  });
  expect(options.meilisearch.deleteFromIndex).toHaveBeenCalledWith(
    ["doc_b"],
    "product_document",
  );
  expect(options.state.has("doc_orphan")).toBe(true);
  expect(options.meilisearch.listDocumentIds).not.toHaveBeenCalled();
  expect(options.meilisearch.configureIndex).not.toHaveBeenCalled();
});

it.each([
  [],
  ["doc_a", "doc_a"],
  ["doc_a", "doc_b", "doc_c"],
  ["bad/id"],
  "doc_a",
  null,
])("rejects invalid bounded scope before I/O (%j)", async (documentIds) => {
  const options = fixture();
  await expect(
    reconcileProductDocuments({ ...options, documentIds } as never),
  ).rejects.toThrow();
  expect(options.strapi.listProductDocuments).not.toHaveBeenCalled();
  expect(options.meilisearch.indexData).not.toHaveBeenCalled();
});

it("rejects conflicting legacy and batch scopes before I/O", async () => {
  const options = fixture();
  await expect(
    reconcileProductDocuments({ ...options, documentId: "doc_a" }),
  ).rejects.toThrow();
  expect(options.strapi.listProductDocuments).not.toHaveBeenCalled();
});

it.each([
  "second-read-fails",
  "foreign-row",
  "duplicate-row",
  "settings-fail",
  "missing-settings-reader",
  "unsafe-displayed-fields",
  "missing-filter",
  "missing-searchable",
])("makes no mutation when scoped preflight fails (%s)", async (failure) => {
  const options = fixture();
  const before = JSON.stringify([...options.state]);
  if (failure === "second-read-fails")
    options.strapi.listProductDocuments.mockImplementation(
      async (_p, scope) => {
        if (scope?.documentId === "doc_b") throw new Error("CMS unavailable");
        return options.rows.filter((r) => r.id === scope?.documentId);
      },
    );
  if (failure === "foreign-row")
    options.strapi.listProductDocuments.mockResolvedValueOnce([
      options.rows[2],
    ]);
  if (failure === "duplicate-row")
    options.strapi.listProductDocuments.mockResolvedValueOnce([
      options.rows[0],
      options.rows[0],
    ]);
  if (failure === "settings-fail")
    options.meilisearch.getIndexSettings.mockRejectedValueOnce(
      new Error("index unavailable"),
    );
  if (failure === "missing-settings-reader")
    Object.assign(options.meilisearch, { getIndexSettings: undefined });
  if (failure === "unsafe-displayed-fields")
    options.meilisearch.getIndexSettings.mockResolvedValueOnce({
      ...PUBLIC_KNOWLEDGE_INDEX_SETTINGS,
      displayedAttributes: ["*"],
    });
  if (failure === "missing-filter")
    options.meilisearch.getIndexSettings.mockResolvedValueOnce({
      ...PUBLIC_KNOWLEDGE_INDEX_SETTINGS,
      filterableAttributes: [],
    });
  if (failure === "missing-searchable")
    options.meilisearch.getIndexSettings.mockResolvedValueOnce({
      ...PUBLIC_KNOWLEDGE_INDEX_SETTINGS,
      searchableAttributes: [],
    });
  await expect(reconcileProductDocuments(options)).rejects.toThrow();
  expect(JSON.stringify([...options.state])).toBe(before);
  expect(options.meilisearch.configureIndex).not.toHaveBeenCalled();
  expect(options.meilisearch.indexData).not.toHaveBeenCalled();
  expect(options.meilisearch.deleteFromIndex).not.toHaveBeenCalled();
});
