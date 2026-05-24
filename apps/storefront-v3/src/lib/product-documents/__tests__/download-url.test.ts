import { getPublicDocumentDownloadUrl } from "../download-url"

describe("getPublicDocumentDownloadUrl", () => {
  it("routes Medusa product document paths through the storefront proxy API", () => {
    expect(
      getPublicDocumentDownloadUrl("/store/product-documents/doc_1/download")
    ).toBe("/api/product-documents/doc_1/download")
  })

  it("routes absolute Medusa product document paths through the storefront API", () => {
    expect(
      getPublicDocumentDownloadUrl(
        "https://api.example.com/store/product-documents/doc_1/download"
      )
    ).toBe("/api/product-documents/doc_1/download")
  })

  it("does not expose arbitrary absolute CDN URLs", () => {
    expect(
      getPublicDocumentDownloadUrl("https://cdn.example.com/manual.pdf")
    ).toBe(
      "#"
    )
  })
})
