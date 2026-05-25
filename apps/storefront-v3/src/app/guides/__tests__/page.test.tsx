import { render, screen } from "@testing-library/react"

import GuidesPage from "../page"

import { getBlogPostCategories, getBlogPosts } from "@/lib/strapi/content"

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

jest.mock("@/lib/strapi/content", () => ({
  getBlogPostCategories: jest.fn(),
  getBlogPosts: jest.fn(),
}))

jest.mock("@/features/search/components/content-search-box", () => ({
  ContentSearchBox: ({ placeholder }: { placeholder: string }) => (
    <input aria-label="Guide search" placeholder={placeholder} />
  ),
}))

const mockGetBlogPosts = getBlogPosts as jest.MockedFunction<typeof getBlogPosts>
const mockGetBlogPostCategories =
  getBlogPostCategories as jest.MockedFunction<typeof getBlogPostCategories>

describe("Guides page", () => {
  beforeEach(() => {
    mockGetBlogPosts.mockReset()
    mockGetBlogPostCategories.mockReset()
  })

  it("uses CMS blog content and categories instead of hard-coded guide cards", async () => {
    mockGetBlogPosts.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          documentId: "blog_doc_1",
          Title: "Klipper Bed Mesh From CMS",
          Slug: "klipper-bed-mesh-from-cms",
          Content: "A practical setup guide.",
          Excerpt: "Dial in first layers with a repeatable bed mesh workflow.",
          Categories: [
            {
              id: 1,
              documentId: "cat_doc_1",
              Title: "Calibration",
              Slug: "calibration",
            },
          ],
          publishedAt: "2026-05-23T05:03:41.289Z",
          createdAt: "2026-05-23T05:03:41.289Z",
        },
      ],
      meta: {
        pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 },
      },
    })
    mockGetBlogPostCategories.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          documentId: "cat_doc_1",
          Title: "Calibration",
          Slug: "calibration",
        },
      ],
      meta: {
        pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 },
      },
    })

    render(await GuidesPage())

    expect(screen.getByText("Klipper Bed Mesh From CMS")).toBeInTheDocument()
    expect(screen.queryByText("Voron 2.4 Full Build Guide")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /calibration/i })).toHaveAttribute(
      "href",
      "/blog?category=calibration"
    )
  })
})
