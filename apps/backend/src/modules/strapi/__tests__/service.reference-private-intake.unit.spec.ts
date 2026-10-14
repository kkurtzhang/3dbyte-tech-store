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
describe("bounded private document intake lookup", () => {
  beforeEach(() => jest.clearAllMocks());
  it("uses authenticated exact private lookup for both statuses, preserving existing draft identity", async () => {
    global.fetch = jest.fn(async (input: string, options: RequestInit) => ({
      ok: true,
      json: async () => ({
        data: input.includes("import-lookup")
          ? [
              {
                documentId: "doc_private",
                medusa_product_id: "prod_exact",
                source_url: document.source_url,
              },
            ]
          : options.method === "PUT"
            ? { documentId: "doc_private" }
            : [],
      }),
    })) as never;
    await service().upsertAiProductDocumentDrafts("prod_exact", [document]);
    const calls = (global.fetch as jest.Mock).mock.calls;
    const lookups = calls.filter(([url]) => url.includes("import-lookup"));
    expect(lookups).toHaveLength(2);
    expect(
      lookups.map(([url]) => new URL(url).searchParams.get("status")),
    ).toEqual(["draft", "published"]);
    expect(
      lookups.every(
        ([, options]) =>
          options.headers.Authorization === "Bearer test-fixture",
      ),
    ).toBe(true);
    expect(
      calls.some(
        ([url, options]) =>
          url.endsWith("product-documents/doc_private?status=draft") &&
          options.method === "PUT",
      ),
    ).toBe(true);
    expect(calls.some(([, options]) => options.method === "POST")).toBe(false);
  });
  it("rejects distinct identities and malformed private responses without creating records", async () => {
    for (const body of [
      { data: undefined },
      { data: [{}] },
      { data: [{ documentId: "doc_one" }, { documentId: "doc_two" }] },
    ]) {
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => body,
      })) as never;
      await expect(
        service().upsertAiProductDocumentDrafts("prod_exact", [document]),
      ).rejects.toThrow();
      expect(
        (global.fetch as jest.Mock).mock.calls.some(([, options]) =>
          ["POST", "PUT"].includes(options.method),
        ),
      ).toBe(false);
    }
  });
});
