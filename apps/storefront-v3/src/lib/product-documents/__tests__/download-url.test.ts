import { getPublicDocumentDownloadUrl } from "../download-url"

describe("getPublicDocumentDownloadUrl", () => {
  it("routes Medusa product document paths through the storefront redirect API", () => {
    expect(
      getPublicDocumentDownloadUrl("/store/product-documents/doc_1/download")
    ).toBe("/api/product-documents/doc_1/download")
  })

  it("keeps absolute URLs unchanged", () => {
    expect(getPublicDocumentDownloadUrl("https://example.com/manual.pdf")).toBe(
      "https://example.com/manual.pdf"
    )
  })
})
