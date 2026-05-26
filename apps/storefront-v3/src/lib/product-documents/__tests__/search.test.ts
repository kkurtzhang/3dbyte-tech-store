const mockSearch = jest.fn();
const mockIndex = jest.fn(() => ({ search: mockSearch }));
const mockMeiliSearch = jest.fn(() => ({ index: mockIndex }));

jest.mock("meilisearch", () => ({
  MeiliSearch: jest.fn().mockImplementation((...args: unknown[]) =>
    mockMeiliSearch(...args),
  ),
}));

const loadSearchModule = async () => {
  jest.resetModules();
  return import("../search");
};

describe("searchPublicProductDocuments", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockSearch.mockResolvedValue({
      hits: [
        {
          id: "doc_1",
          title: "Printer Manual",
          document_type: "manual",
          product_title: "Printer One",
          public_download_path: "/store/product-documents/doc_1/download",
        },
      ],
      estimatedTotalHits: 1,
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("reads the public search key from runtime env for server-rendered downloads", async () => {
    process.env.NEXT_PUBLIC_MEILISEARCH_API_KEY = "stale-build-key";
    process.env.NEXT_PUBLIC_MEILISEARCH_PRODUCT_DOCUMENT_INDEX_NAME =
      "stale_documents";

    const { searchPublicProductDocuments } = await loadSearchModule();

    process.env.NEXT_PUBLIC_MEILISEARCH_API_KEY = "runtime-search-key";
    process.env.MEILISEARCH_SERVER_HOST = "http://meilisearch:7700";
    process.env.NEXT_PUBLIC_MEILISEARCH_PRODUCT_DOCUMENT_INDEX_NAME =
      "runtime_documents";

    await searchPublicProductDocuments({ query: "printer" });

    expect(mockMeiliSearch).toHaveBeenLastCalledWith({
      host: "http://meilisearch:7700",
      apiKey: "runtime-search-key",
    });
    expect(mockIndex).toHaveBeenCalledWith("runtime_documents");
  });

  it("queries the public product document index directly", async () => {
    const { searchPublicProductDocuments } = await loadSearchModule();

    await expect(
      searchPublicProductDocuments({ query: "printer", type: "manual" }),
    ).resolves.toEqual({
      documents: [
        expect.objectContaining({
          id: "doc_1",
          title: "Printer Manual",
        }),
      ],
      total: 1,
    });

    expect(mockIndex).toHaveBeenCalledWith("product_documents_public");
    expect(mockSearch).toHaveBeenCalledWith(
      "printer",
      expect.objectContaining({
        filter: ['document_type = "manual"'],
      }),
    );
  });

  it("returns an empty result when the public document index is unavailable", async () => {
    const { searchPublicProductDocuments } = await loadSearchModule();
    mockSearch.mockRejectedValue(new Error("index_not_found"));

    await expect(
      searchPublicProductDocuments({ query: "printer" }),
    ).resolves.toEqual({
      documents: [],
      total: 0,
    });
  });
});
