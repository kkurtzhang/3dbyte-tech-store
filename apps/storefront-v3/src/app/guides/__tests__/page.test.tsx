import { render, screen } from "@testing-library/react"

import GuidesPage from "../page"

import { getBlogPostCategories, getBlogPosts, getGuidesPage } from "@/lib/strapi/content"

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
  getGuidesPage: jest.fn(),
}))

jest.mock("@/features/search/components/content-search-box", () => ({
  ContentSearchBox: ({ placeholder }: { placeholder: string }) => (
    <input aria-label="Guide search" placeholder={placeholder} />
  ),
}))

const mockGetBlogPosts = getBlogPosts as jest.MockedFunction<typeof getBlogPosts>
const mockGetBlogPostCategories =
  getBlogPostCategories as jest.MockedFunction<typeof getBlogPostCategories>
const mockGetGuidesPage = getGuidesPage as jest.MockedFunction<typeof getGuidesPage>

describe("Guides page", () => {
  beforeEach(() => {
    mockGetBlogPosts.mockReset()
    mockGetBlogPostCategories.mockReset()
    mockGetGuidesPage.mockReset()
  })

  it("uses CMS blog content and categories instead of hard-coded guide cards", async () => {
    mockGetGuidesPage.mockRejectedValueOnce(new Error("Guides page CMS unavailable"))
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

  it("renders CMS-managed guides page content when available", async () => {
    mockGetGuidesPage.mockResolvedValueOnce({
      data: {
        id: 1,
        Heading: "Builder Knowledge Base",
        Subheading: "Curated tutorials, checklists, and workshop references from Strapi.",
        FeaturedGuides: [
          {
            id: 1,
            Title: "First Layer Checklist",
            Category: "Calibration",
            ReadTime: "6 min",
            Rating: "Beginner",
            Description: "A concise checklist for repeatable first layers.",
            Href: "/blog/first-layer-checklist",
            Icon: "settings",
          },
        ],
        Categories: [
          {
            id: 1,
            Title: "Troubleshooting",
            Description: "Fix failed prints, noisy motion, and extrusion issues.",
            Icon: "wrench",
            Tone: "orange",
            Guides: [
              {
                id: 1,
                Title: "Diagnose inconsistent extrusion",
                Href: "/blog/inconsistent-extrusion",
              },
            ],
          },
        ],
        QuickLinks: [
          {
            id: 1,
            Title: "Download Center",
            Href: "/downloads",
            Icon: "download",
          },
        ],
      },
      meta: {},
    })
    mockGetBlogPosts.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          documentId: "blog_doc_1",
          Title: "Klipper Bed Mesh From CMS",
          Slug: "klipper-bed-mesh-from-cms",
          Content: "A practical setup guide.",
          Excerpt: "Dial in first layers with a repeatable bed mesh workflow.",
          Categories: [],
          publishedAt: "2026-05-23T05:03:41.289Z",
          createdAt: "2026-05-23T05:03:41.289Z",
        },
      ],
      meta: {
        pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 },
      },
    })
    mockGetBlogPostCategories.mockResolvedValueOnce({
      data: [],
      meta: {
        pagination: { page: 1, pageSize: 25, pageCount: 1, total: 0 },
      },
    })

    render(await GuidesPage())

    expect(screen.getByRole("heading", { name: "Builder Knowledge Base" })).toBeInTheDocument()
    expect(
      screen.getByText("Curated tutorials, checklists, and workshop references from Strapi.")
    ).toBeInTheDocument()
    expect(screen.getByText("First Layer Checklist")).toBeInTheDocument()
    expect(screen.getByText("6 min")).toBeInTheDocument()
    expect(screen.getByText("Troubleshooting")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /diagnose inconsistent extrusion/i })).toHaveAttribute(
      "href",
      "/blog/inconsistent-extrusion"
    )
    expect(screen.getByRole("link", { name: /download center/i })).toHaveAttribute(
      "href",
      "/downloads"
    )
  })
})
