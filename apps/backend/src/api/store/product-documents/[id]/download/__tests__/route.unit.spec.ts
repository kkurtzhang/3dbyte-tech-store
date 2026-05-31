import { GET } from "../route";

jest.mock("../../../../../../modules/strapi", () => ({
  STRAPI_MODULE: "strapi",
}))

const originalFetch = global.fetch;
const originalEnv = { ...process.env };

function createResponse() {
  const res = {
    redirect: jest.fn(),
    setHeader: jest.fn(),
    status: jest.fn(),
    send: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe("GET /store/product-documents/:id/download", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      S3_BUCKET: "3dbyte-tech-store-media-staging",
      S3_FILE_URL: "https://staging-media.3dbytetech.com.au",
    };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it("proxies R2-backed Strapi files through the public CDN and adds a PDF filename", async () => {
    const getProductDocument = jest.fn().mockResolvedValue({
      id: "doc_1",
      title: "PETG Safety Sheet",
      file_name: "PETG Safety Sheet",
      file_url:
        "https://account.r2.cloudflarestorage.com/3dbyte-tech-store-media-staging/strapiUpload/petg-safety.pdf",
      mime_type: "application/pdf",
    });
    const res = createResponse();
    const body = new TextEncoder().encode("%PDF-1.4").buffer;

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        "content-type": "application/pdf",
      }),
      arrayBuffer: async () => body,
    });

    await GET(
      {
        params: { id: "doc_1" },
        scope: {
          resolve: jest.fn(() => ({ getProductDocument })),
        },
      } as never,
      res as never,
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "https://staging-media.3dbytetech.com.au/strapiUpload/petg-safety.pdf",
      expect.objectContaining({ redirect: "follow" }),
    );
    expect(res.redirect).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/pdf",
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      'attachment; filename="PETG_Safety_Sheet.pdf"',
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(Buffer.from(body));
  });

  it("rejects document file URLs outside the configured Strapi and media origins", async () => {
    const getProductDocument = jest.fn().mockResolvedValue({
      id: "doc_1",
      file_name: "Manual.pdf",
      file_url: "https://not-our-storage.example.com/manual.pdf",
      mime_type: "application/pdf",
    });
    const res = createResponse();

    await expect(
      GET(
        {
          params: { id: "doc_1" },
          scope: {
            resolve: jest.fn(() => ({ getProductDocument })),
          },
        } as never,
        res as never,
      ),
    ).rejects.toThrow("Product document download URL is not allowed");

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("redirects URL-only official source documents without proxying them", async () => {
    const getProductDocument = jest.fn().mockResolvedValue({
      id: "doc_source_1",
      title: "Official Product Page",
      file_url: "",
      source_url: "https://manufacturer.example.com/product",
    });
    const res = createResponse();

    await GET(
      {
        params: { id: "doc_source_1" },
        scope: {
          resolve: jest.fn(() => ({ getProductDocument })),
        },
      } as never,
      res as never,
    );

    expect(res.redirect).toHaveBeenCalledWith(
      302,
      "https://manufacturer.example.com/product",
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects URL-only source documents with unsupported protocols", async () => {
    const getProductDocument = jest.fn().mockResolvedValue({
      id: "doc_source_1",
      file_url: "",
      source_url: "javascript:alert(1)",
    });
    const res = createResponse();

    await expect(
      GET(
        {
          params: { id: "doc_source_1" },
          scope: {
            resolve: jest.fn(() => ({ getProductDocument })),
          },
        } as never,
        res as never,
      ),
    ).rejects.toThrow("Product document source URL is not allowed");
  });

  it("rejects URL-only source documents on private hosts", async () => {
    const getProductDocument = jest.fn().mockResolvedValue({
      id: "doc_source_1",
      file_url: "",
      source_url: "https://127.0.0.1/internal-manual.pdf",
    });
    const res = createResponse();

    await expect(
      GET(
        {
          params: { id: "doc_source_1" },
          scope: {
            resolve: jest.fn(() => ({ getProductDocument })),
          },
        } as never,
        res as never,
      ),
    ).rejects.toThrow("Product document source URL is not allowed");
  });

  it("fails closed when no document download origin allowlist is configured", async () => {
    delete process.env.S3_FILE_URL;
    delete process.env.STRAPI_API_URL;
    delete process.env.STRAPI_URL;

    const getProductDocument = jest.fn().mockResolvedValue({
      id: "doc_1",
      file_name: "Manual.pdf",
      file_url: "https://staging-media.3dbytetech.com.au/manual.pdf",
      mime_type: "application/pdf",
    });
    const res = createResponse();

    await expect(
      GET(
        {
          params: { id: "doc_1" },
          scope: {
            resolve: jest.fn(() => ({ getProductDocument })),
          },
        } as never,
        res as never,
      ),
    ).rejects.toThrow("Product document download URL is not allowed");

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
