import StrapiModuleService from "../service";
const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};
const document = {
  medusa_product_id: "prod_exact",
  product_title: "Exact reference",
  product_handle: "exact-reference",
  title: "Official document",
  document_type: "other",
  source_url: "https://manufacturer.example/exact",
  source_kind: "official_product_page",
  source_label: "Manufacturer",
  source_checked_at: "2026-10-08T00:00:00Z",
  search_keywords: [],
  is_public: false,
};
const service = () =>
  new StrapiModuleService(
    { logger: logger as never },
    { apiUrl: "https://cms.example", apiToken: "test-fixture" },
  );
describe("atomic private document intake", () => {
  afterEach(() => jest.restoreAllMocks());
  it("uses authenticated atomic CMS upsert and preserves the returned document identity", async () => {
    const fetch = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            documentId: "doc_private",
            medusa_product_id: "prod_exact",
            source_url: document.source_url,
          },
        }),
      } as Response);
    expect(
      await service().upsertAiProductDocumentDrafts("prod_exact", [document]),
    ).toEqual([expect.objectContaining({ documentId: "doc_private" })]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "https://cms.example/api/product-documents/import-upsert",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Bearer test-fixture",
        }),
        body: JSON.stringify({ data: document }),
      }),
    );
  });
  it("rejects mismatched native identities before sending and malformed replies after the action", async () => {
    const fetch = jest.spyOn(global, "fetch");
    await expect(
      service().upsertAiProductDocumentDrafts("prod_other", [document]),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
    for (const data of [
      undefined,
      {},
      {
        documentId: "doc_private",
        medusa_product_id: "prod_wrong",
        source_url: document.source_url,
      },
    ]) {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data }),
      } as Response);
      await expect(
        service().upsertAiProductDocumentDrafts("prod_exact", [document]),
      ).rejects.toThrow();
    }
  });
});
