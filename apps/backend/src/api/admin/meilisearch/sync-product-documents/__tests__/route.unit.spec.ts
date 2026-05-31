import { POST } from "../route";
import { MEILISEARCH_MODULE } from "../../../../../modules/meilisearch";
import { STRAPI_MODULE } from "../../../../../modules/strapi";

function createResponse() {
  return {
    json: jest.fn(),
  };
}

function createRequest({
  documents,
  existingIds,
}: {
  documents: Record<string, unknown>[];
  existingIds: string[];
}) {
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
  };
  const strapiService = {
    listProductDocuments: jest.fn().mockResolvedValue(documents),
  };
  const meilisearchService = {
    configureIndex: jest.fn().mockResolvedValue(undefined),
    indexData: jest.fn().mockResolvedValue(undefined),
    listDocumentIds: jest.fn().mockResolvedValue(existingIds),
    deleteFromIndex: jest.fn().mockResolvedValue(undefined),
  };

  return {
    logger,
    strapiService,
    meilisearchService,
    req: {
      scope: {
        resolve: jest.fn((key) => {
          if (key === "logger") {
            return logger;
          }
          if (key === STRAPI_MODULE) {
            return strapiService;
          }
          if (key === MEILISEARCH_MODULE) {
            return meilisearchService;
          }
          throw new Error(`Unexpected dependency: ${String(key)}`);
        }),
      },
    },
  };
}

describe("POST /admin/meilisearch/sync-product-documents", () => {
  it("deletes indexed product documents that are no longer public in Strapi", async () => {
    const { req, meilisearchService } = createRequest({
      documents: [
        {
          id: "doc_keep",
          medusa_product_id: "prod_1",
          product_handle: "petg",
          product_title: "PETG",
          title: "PETG Manual",
          document_type: "manual",
          file_name: "petg-manual.pdf",
          file_size: 1024,
          search_keywords: ["petg"],
          sort_order: 1,
          published_at: "2026-05-01T00:00:00.000Z",
        },
      ],
      existingIds: ["doc_keep", "doc_stale"],
    });
    const res = createResponse();

    await POST(req as never, res as never);

    expect(meilisearchService.indexData).toHaveBeenCalledWith(
      [expect.objectContaining({ id: "doc_keep" })],
      "product_document",
    );
    expect(meilisearchService.deleteFromIndex).toHaveBeenCalledWith(
      ["doc_stale"],
      "product_document",
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        indexed: 1,
        deleted: 1,
      }),
    );
  });

  it("removes all stale indexed product documents when Strapi has no public documents", async () => {
    const { req, meilisearchService } = createRequest({
      documents: [],
      existingIds: ["doc_old"],
    });
    const res = createResponse();

    await POST(req as never, res as never);

    expect(meilisearchService.indexData).not.toHaveBeenCalled();
    expect(meilisearchService.deleteFromIndex).toHaveBeenCalledWith(
      ["doc_old"],
      "product_document",
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        indexed: 0,
        deleted: 1,
      }),
    );
  });
});
