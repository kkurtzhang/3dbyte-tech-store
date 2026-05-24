const mockSearch = jest.fn();
const mockIndex = jest.fn(() => ({ search: mockSearch }));

jest.mock("@/lib/search/client", () => ({
  INDEX_PRODUCT_DOCUMENTS: "product_documents_public",
  searchClient: {
    index: (...args: unknown[]) => mockIndex(...args),
  },
}));

import { searchPublicProductDocuments } from "../search";

describe("searchPublicProductDocuments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it("queries the public product document index directly", async () => {
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
    mockSearch.mockRejectedValue(new Error("index_not_found"));

    await expect(searchPublicProductDocuments({ query: "printer" })).resolves.toEqual({
      documents: [],
      total: 0,
    });
  });
});
