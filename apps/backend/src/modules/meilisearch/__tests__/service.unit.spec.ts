import MeilisearchModuleService from "../service";

const mockIndex = {
  getDocuments: jest.fn(),
  updateFilterableAttributes: jest.fn(),
  updateSortableAttributes: jest.fn(),
  updateSearchableAttributes: jest.fn(),
  updateDisplayedAttributes: jest.fn(),
  updateRankingRules: jest.fn(),
  updateTypoTolerance: jest.fn(),
  updateFaceting: jest.fn(),
  updatePagination: jest.fn(),
};

jest.mock("meilisearch", () => ({
  MeiliSearch: jest.fn().mockImplementation(() => ({
    index: jest.fn().mockReturnValue(mockIndex),
  })),
}));

function createService() {
  return new MeilisearchModuleService(
    {
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      } as never,
    },
    {
      host: "http://localhost:7700",
      apiKey: "test-key",
      productIndexName: "products",
      categoryIndexName: "categories",
      brandIndexName: "brands",
      addressIndexName: "addresses",
      localityIndexName: "localities",
    },
  );
}

function createTask(taskUid: number) {
  return {
    taskUid,
    indexUid: "addresses",
    status: "enqueued",
    type: "settingsUpdate",
    enqueuedAt: new Date().toISOString(),
  };
}

describe("MeilisearchModuleService.configureIndex", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIndex.getDocuments.mockResolvedValue({ results: [], total: 0 });
    [
      mockIndex.updateFilterableAttributes,
      mockIndex.updateSortableAttributes,
      mockIndex.updateSearchableAttributes,
      mockIndex.updateDisplayedAttributes,
      mockIndex.updateRankingRules,
      mockIndex.updateTypoTolerance,
      mockIndex.updateFaceting,
      mockIndex.updatePagination,
    ].forEach((method, index) => {
      method.mockResolvedValue(createTask(index + 1));
    });
  });

  it("applies empty filterable and sortable attributes so settings can be cleared", async () => {
    const service = createService();

    await service.configureIndex(
      {
        filterableAttributes: [],
        sortableAttributes: [],
      },
      "address",
    );

    expect(mockIndex.updateFilterableAttributes).toHaveBeenCalledWith([]);
    expect(mockIndex.updateSortableAttributes).toHaveBeenCalledWith([]);
  });
});

describe("MeilisearchModuleService.listDocumentIds", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("paginates through index documents and returns normalized string IDs", async () => {
    mockIndex.getDocuments
      .mockResolvedValueOnce({
        results: [{ id: "doc_1" }, { id: 42 }],
        total: 3,
      })
      .mockResolvedValueOnce({
        results: [{ id: "doc_3" }],
        total: 3,
      });
    const service = createService();

    await expect(
      service.listDocumentIds("product_document", 2),
    ).resolves.toEqual(["doc_1", "42", "doc_3"]);

    expect(mockIndex.getDocuments).toHaveBeenNthCalledWith(1, {
      fields: ["id"],
      limit: 2,
      offset: 0,
    });
    expect(mockIndex.getDocuments).toHaveBeenNthCalledWith(2, {
      fields: ["id"],
      limit: 2,
      offset: 2,
    });
  });

  it("treats a missing index as an empty document set", async () => {
    mockIndex.getDocuments.mockRejectedValueOnce({
      cause: { code: "index_not_found" },
    });
    const service = createService();

    await expect(service.listDocumentIds("brand")).resolves.toEqual([]);
  });
});
