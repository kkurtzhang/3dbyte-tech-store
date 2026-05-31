import { deleteStaleIndexDocuments } from "../reconcile-index";

function createLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

describe("deleteStaleIndexDocuments", () => {
  it("deletes documents that exist in Meilisearch but not in the source IDs", async () => {
    const logger = createLogger();
    const meilisearchService = {
      listDocumentIds: jest.fn().mockResolvedValue(["keep", "stale"]),
      deleteFromIndex: jest.fn().mockResolvedValue(undefined),
    };

    await expect(
      deleteStaleIndexDocuments({
        currentIds: ["keep"],
        label: "product document",
        logger: logger as never,
        meilisearchService: meilisearchService as never,
        type: "product_document",
      }),
    ).resolves.toBe(1);

    expect(meilisearchService.deleteFromIndex).toHaveBeenCalledWith(
      ["stale"],
      "product_document",
    );
  });

  it("does not call Meilisearch delete when no stale documents exist", async () => {
    const logger = createLogger();
    const meilisearchService = {
      listDocumentIds: jest.fn().mockResolvedValue(["keep"]),
      deleteFromIndex: jest.fn().mockResolvedValue(undefined),
    };

    await expect(
      deleteStaleIndexDocuments({
        currentIds: ["keep"],
        label: "brand",
        logger: logger as never,
        meilisearchService: meilisearchService as never,
        type: "brand",
      }),
    ).resolves.toBe(0);

    expect(meilisearchService.deleteFromIndex).not.toHaveBeenCalled();
  });
});
