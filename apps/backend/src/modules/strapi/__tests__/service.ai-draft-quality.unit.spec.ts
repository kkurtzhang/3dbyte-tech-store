import StrapiModuleService from "../service"
const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
const service = () => new StrapiModuleService({ logger: logger as never }, { apiUrl: "http://cms.test", apiToken: "test-only" })
const draft = { medusa_product_id: "prod_1", product_title: "H1", product_handle: "h1", rich_description: "Verified copy", features: [], specifications: {}, seo_title: "H1", seo_description: "", meta_keywords: [] }
const response = (data: unknown) => ({ ok: true, json: async () => ({ data }) })
describe("AI draft CMS identity safety", () => {
  beforeEach(() => { global.fetch = jest.fn() })
  it("does not create an automatic placeholder for an AI-owned product shell", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response([]))
    await service().createProductDescription({ id: "prod_1", title: "H1", handle: "h1", metadata: { ai_product_draft_id: "aipd_1" } } as never)
    expect(global.fetch).not.toHaveBeenCalled()
  })
  it("refuses ambiguous existing document identities instead of overwriting the first", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(response([{ documentId: "one" }, { documentId: "two" }]))
    await expect(service().upsertAiProductDescriptionDraft(draft)).rejects.toThrow(/Multiple/)
    expect((global.fetch as jest.Mock).mock.calls.every(([, options]) => !options.method || options.method === "GET")).toBe(true)
  })
  it("reuses a published identity for its draft instead of creating a second document", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(response([])).mockResolvedValueOnce(response([{ documentId: "canonical" }])).mockResolvedValueOnce(response({ documentId: "canonical" }))
    await service().upsertAiProductDescriptionDraft(draft)
    expect(global.fetch).toHaveBeenLastCalledWith("http://cms.test/api/product-descriptions/canonical?status=draft", expect.objectContaining({ method: "PUT" }))
  })
})
