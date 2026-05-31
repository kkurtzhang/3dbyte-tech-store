import StrapiModuleService from "../service";

describe("StrapiModuleService product documents", () => {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  function createService() {
    return new StrapiModuleService({ logger }, {
      apiUrl: "http://localhost:1337",
      apiToken: "test-token",
    } as any);
  }

  it("returns an empty list without error logging when product documents fail soft", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () =>
        JSON.stringify({
          data: null,
          error: {
            status: 404,
            name: "NotFoundError",
            message: "Not Found",
          },
        }),
    });

    const service = createService();

    await expect(
      service.listProductDocuments("prod_1", { failSoft: true }),
    ).resolves.toEqual([]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("resolves a public product document through the filtered collection route", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            documentId: "doc_public_1",
            medusa_product_id: "prod_1",
            product_handle: "printer-one",
            product_title: "Printer One",
            title: "Printer One Manual",
            document_type: "manual",
            is_public: true,
            file: {
              name: "manual.pdf",
              url: "https://cdn.example.com/manual.pdf",
              mime: "application/pdf",
              size: 512,
            },
          },
        ],
      }),
    });

    const service = createService();

    await expect(service.getProductDocument("doc_public_1")).resolves.toEqual(
      expect.objectContaining({
        id: "doc_public_1",
        file_url: "https://cdn.example.com/manual.pdf",
      }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:1337/api/product-documents?populate[file]=true&filters[documentId][$eq]=doc_public_1&filters[is_public][$eq]=true&pagination[pageSize]=1",
      expect.any(Object),
    );
    expect((global.fetch as jest.Mock).mock.calls[0][1].headers).toEqual({
      "Content-Type": "application/json",
    });
  });

  it("keeps public source URL documents even when no media file is attached", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            documentId: "doc_source_1",
            medusa_product_id: "prod_1",
            product_handle: "printer-one",
            product_title: "Printer One",
            title: "Printer One Official Product Page",
            document_type: "other",
            is_public: true,
            source_url: "https://manufacturer.example.com/printer-one",
            source_kind: "official_product_page",
            source_label: "Official product page",
          },
        ],
      }),
    });

    const service = createService();

    await expect(service.listProductDocuments("prod_1")).resolves.toEqual([
      expect.objectContaining({
        id: "doc_source_1",
        file_url: "",
        source_url: "https://manufacturer.example.com/printer-one",
      }),
    ]);
  });
});
