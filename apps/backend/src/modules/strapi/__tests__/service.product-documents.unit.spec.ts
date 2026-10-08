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
        meta: {
          pagination: { page: 1, pageSize: 200, pageCount: 1, total: 1 },
        },
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

  function document(id: number) {
    return {
      documentId: `doc_${id}`,
      medusa_product_id: "prod_1",
      title: `Manual ${id}`,
      source_url: `https://manufacturer.example.com/manual-${id}`,
      is_public: true,
    };
  }

  function pageResponse(page: number, total = 201, pageSize = 100) {
    return {
      data: Array.from(
        {
          length: Math.max(
            0,
            Math.min(pageSize, total - (page - 1) * pageSize),
          ),
        },
        (_, index) => document((page - 1) * pageSize + index),
      ),
      meta: {
        pagination: {
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
          total,
        },
      },
    };
  }

  function servePages(transform = (page: number) => pageResponse(page)) {
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      const page = Number(
        new URL(url).searchParams.get("pagination[page]") || 1,
      );
      return { ok: true, status: 200, json: async () => transform(page) };
    });
  }

  it("reads the entire library even when Strapi clamps the requested page size", async () => {
    servePages();
    const result = await createService().listProductDocuments("prod_1");
    expect(result).toHaveLength(201);
    expect(result.at(-1)?.id).toBe("doc_200");
    expect(global.fetch).toHaveBeenCalledTimes(3);
    for (const [url, options] of (global.fetch as jest.Mock).mock.calls) {
      expect(url).toContain("status=published");
      expect(url).toContain("filters[is_public][$eq]=true");
      expect(url).toContain("filters[medusa_product_id][$eq]=prod_1");
      expect(url).toContain("sort[2]=documentId:asc");
      expect(options.headers.Authorization).toBeUndefined();
    }
  });

  it("rejects incomplete or inconsistent snapshots instead of authorizing index deletion", async () => {
    for (const transform of [
      () => ({ data: [document(1)] }),
      (page: number) => ({ ...pageResponse(page), data: [] }),
      (page: number) => pageResponse(page, page === 1 ? 201 : 200),
      (page: number) => ({
        ...pageResponse(page),
        meta: {
          pagination: { page: 1, pageSize: 100, pageCount: 3, total: 201 },
        },
      }),
      (page: number) => ({ ...pageResponse(page), data: pageResponse(1).data }),
      (page: number) => pageResponse(page, 100_000),
    ]) {
      jest.clearAllMocks();
      servePages(transform as never);
      await expect(createService().listProductDocuments()).rejects.toThrow();
    }
  });

  it("returns no partial documents on a later failure in fail-soft reads", async () => {
    servePages();
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      const page = Number(
        new URL(url).searchParams.get("pagination[page]") || 1,
      );
      if (page === 2) throw new Error("Page unavailable");
      return { ok: true, status: 200, json: async () => pageResponse(page) };
    });
    await expect(
      createService().listProductDocuments("prod_1", { failSoft: true }),
    ).resolves.toEqual([]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("accepts an explicitly complete empty library", async () => {
    servePages((page) => pageResponse(page, 0));
    await expect(createService().listProductDocuments()).resolves.toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
