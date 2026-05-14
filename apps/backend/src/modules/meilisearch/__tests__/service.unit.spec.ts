import MeilisearchModuleService from "../service";

const mockIndex = {
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
    Object.values(mockIndex).forEach((method, index) => {
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
