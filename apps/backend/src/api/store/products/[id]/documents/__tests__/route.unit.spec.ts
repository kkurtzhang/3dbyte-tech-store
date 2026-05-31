import { GET } from "../route";

describe("GET /store/products/:id/documents", () => {
  it("returns public backend download paths instead of raw Strapi file URLs", async () => {
    const listProductDocuments = jest.fn().mockResolvedValue([
      {
        id: "doc_1",
        medusa_product_id: "prod_1",
        product_handle: "printer-one",
        product_title: "Printer One",
        title: "Printer Manual",
        document_type: "manual",
        file_url: "https://cdn.example.com/manual.pdf",
        file_name: "manual.pdf",
        mime_type: "application/pdf",
        file_size: 512,
        search_keywords: ["printer"],
        sort_order: 1,
        published_at: "2026-05-01T00:00:00.000Z",
      },
    ]);
    const json = jest.fn();
    const logger = { warn: jest.fn() };

    await GET(
      {
        params: { id: "prod_1" },
        scope: {
          resolve: jest.fn((key) =>
            key === "logger" ? logger : { listProductDocuments },
          ),
        },
      } as never,
      { json } as never,
    );

    expect(json).toHaveBeenCalledWith({
      documents: [
        expect.objectContaining({
          id: "doc_1",
          public_download_path: "/store/product-documents/doc_1/download",
        }),
      ],
    });
    expect(json.mock.calls[0][0].documents[0]).not.toHaveProperty("file_url");
    expect(listProductDocuments).toHaveBeenCalledWith("prod_1", {
      failSoft: true,
    });
  });

  it("routes source-only documents through the guarded backend download endpoint", async () => {
    const listProductDocuments = jest.fn().mockResolvedValue([
      {
        id: "doc_source_1",
        medusa_product_id: "prod_1",
        product_handle: "printer-one",
        product_title: "Printer One",
        title: "Printer Official Product Page",
        document_type: "other",
        file_url: "",
        file_name: "Official product page",
        mime_type: "application/octet-stream",
        file_size: 0,
        source_url: "https://manufacturer.example.com/printer-one",
        source_kind: "official_product_page",
        source_label: "Official product page",
        search_keywords: ["printer", "official"],
        sort_order: 10,
        published_at: "2026-05-01T00:00:00.000Z",
      },
    ]);
    const json = jest.fn();
    const logger = { warn: jest.fn() };

    await GET(
      {
        params: { id: "prod_1" },
        scope: {
          resolve: jest.fn((key) =>
            key === "logger" ? logger : { listProductDocuments },
          ),
        },
      } as never,
      { json } as never,
    );

    expect(json).toHaveBeenCalledWith({
      documents: [
        expect.objectContaining({
          id: "doc_source_1",
          public_download_path: "/store/product-documents/doc_source_1/download",
          source_url: "https://manufacturer.example.com/printer-one",
        }),
      ],
    });
  });

  it("returns an empty public document list when Strapi is unavailable", async () => {
    const listProductDocuments = jest
      .fn()
      .mockRejectedValue(new Error("Strapi unavailable"));
    const json = jest.fn();
    const logger = { warn: jest.fn() };

    await GET(
      {
        params: { id: "prod_1" },
        scope: {
          resolve: jest.fn((key) =>
            key === "logger" ? logger : { listProductDocuments },
          ),
        },
      } as never,
      { json } as never,
    );

    expect(json).toHaveBeenCalledWith({ documents: [] });
    expect(logger.warn).toHaveBeenCalledWith(
      "Failed to load public product documents for prod_1: Strapi unavailable",
    );
  });
});
