import { render, screen } from "@testing-library/react"

import DownloadsPage, { metadata } from "../page"

import { searchPublicProductDocuments } from "@/lib/product-documents/search"

jest.mock("lucide-react", () =>
  new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "__esModule") return true
        return (props: Record<string, unknown>) => <svg {...props} />
      },
    }
  )
)

jest.mock("@/lib/product-documents/search", () => ({
  searchPublicProductDocuments: jest.fn(),
}))

const mockSearchPublicProductDocuments =
  searchPublicProductDocuments as jest.MockedFunction<
    typeof searchPublicProductDocuments
  >

describe("Download Center page", () => {
  beforeEach(() => {
    mockSearchPublicProductDocuments.mockReset()
  })

  it("renders product document results with resource navigation and document type filters", async () => {
    mockSearchPublicProductDocuments.mockResolvedValueOnce({
      total: 1,
      documents: [
        {
          id: "doc_1",
          medusa_product_id: "prod_1",
          product_handle: "box-turtle-apex-gearset-upgrade",
          product_title: "Box Turtle APEX Gearset Upgrade",
          title: "Box Turtle Assembly Manual",
          document_type: "manual",
          version: "v1.2",
          language: "en",
          file_name: "manual.pdf",
          file_size: 128,
          public_download_path: "/store/product-documents/doc_1/download",
          search_keywords: ["assembly"],
          sort_order: 0,
          published_at_timestamp: 1779512621289,
        },
      ],
    })

    render(
      await DownloadsPage({
        searchParams: Promise.resolve({ q: "assembly", type: "manual" }),
      })
    )

    expect(mockSearchPublicProductDocuments).toHaveBeenCalledWith({
      query: "assembly",
      type: "manual",
    })
    expect(
      screen.getByRole("heading", { name: /download center/i })
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /product guides/i })).toHaveAttribute(
      "href",
      "/guides"
    )
    expect(screen.getByRole("link", { name: /account files/i })).toHaveAttribute(
      "href",
      "/account/product-files"
    )
    expect(screen.getByRole("link", { name: /manuals/i })).toHaveAttribute(
      "href",
      "/downloads?type=manual"
    )
    expect(
      screen.getByRole("link", { name: /box turtle assembly manual/i })
    ).toHaveAttribute(
      "href",
      "/api/product-documents/doc_1/download"
    )
  })

  it("defines dedicated SEO metadata for public downloads", () => {
    expect(metadata.title).toBe(
      "Download Center - Manuals & Product Files"
    )
    expect(metadata.description).toContain(
      "manuals, datasheets, safety sheets"
    )
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        title: "Download Center - Manuals & Product Files",
        type: "website",
        url: "/downloads",
      })
    )
  })
})
