import { render, screen } from "@testing-library/react"

import BlogPostPage, { generateMetadata } from "../page"

import { getMDXPost } from "@/lib/mdx"
import { getBlogPostBySlug } from "@/lib/strapi/content"

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

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND")
  }),
}))

jest.mock("@/features/cms/components/mdx-content", () => ({
  MdxContent: ({ content }: { content: string }) => (
    <div data-testid="cms-content">{content}</div>
  ),
}))

jest.mock("@/components/mdx/mdx-provider", () => ({
  MDXProvider: ({ content }: { content: string }) => (
    <div data-testid="local-mdx-content">{content}</div>
  ),
}))

jest.mock("@/lib/strapi/content", () => ({
  getBlogPostBySlug: jest.fn(),
}))

jest.mock("@/lib/mdx", () => ({
  getMDXPost: jest.fn(),
}))

const mockGetBlogPostBySlug = getBlogPostBySlug as jest.MockedFunction<
  typeof getBlogPostBySlug
>
const mockGetMDXPost = getMDXPost as jest.MockedFunction<typeof getMDXPost>

const cmsPost = {
  id: 1,
  documentId: "blog_doc_1",
  Title: "Choosing Nozzle Diameter by Use Case",
  Slug: "choosing-nozzle-diameter-by-use-case",
  Content: "Use 0.4 mm for balanced print quality and speed.",
  Excerpt: "Match nozzle size to strength, finish, and throughput.",
  Categories: [
    {
      id: 1,
      documentId: "cat_doc_1",
      Title: "Guides",
      Slug: "guides",
    },
  ],
  publishedAt: "2026-05-23T05:03:41.289Z",
  createdAt: "2026-05-23T05:03:41.289Z",
}

describe("Blog post page", () => {
  const originalStrapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL

  beforeEach(() => {
    mockGetBlogPostBySlug.mockReset()
    mockGetMDXPost.mockReset()
    process.env.NEXT_PUBLIC_STRAPI_URL = "https://cms.example.com"
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_STRAPI_URL = originalStrapiUrl
  })

  it("renders CMS blog detail pages before falling back to local MDX posts", async () => {
    mockGetBlogPostBySlug.mockResolvedValueOnce({
      data: [cmsPost],
      meta: {
        pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 },
      },
    })
    mockGetMDXPost.mockResolvedValue(null)

    render(
      await BlogPostPage({
        params: Promise.resolve({ slug: cmsPost.Slug }),
      })
    )

    expect(mockGetBlogPostBySlug).toHaveBeenCalledWith(cmsPost.Slug)
    expect(mockGetMDXPost).not.toHaveBeenCalled()
    expect(
      screen.getByRole("heading", { name: cmsPost.Title })
    ).toBeInTheDocument()
    expect(screen.getByText(cmsPost.Excerpt)).toBeInTheDocument()
    expect(screen.getByText("Guides")).toBeInTheDocument()
    expect(screen.getByTestId("cms-content")).toHaveTextContent(cmsPost.Content)
  })

  it("uses CMS post data for metadata", async () => {
    mockGetBlogPostBySlug.mockResolvedValueOnce({
      data: [cmsPost],
      meta: {
        pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 },
      },
    })

    await expect(
      generateMetadata({
        params: Promise.resolve({ slug: cmsPost.Slug }),
      })
    ).resolves.toMatchObject({
      title: cmsPost.Title,
      description: cmsPost.Excerpt,
    })
    expect(mockGetMDXPost).not.toHaveBeenCalled()
  })

  it("prefers CMS SEO fields and Open Graph image for metadata", async () => {
    mockGetBlogPostBySlug.mockResolvedValueOnce({
      data: [
        {
          ...cmsPost,
          seo_title: "Nozzle Diameter Guide for 3D Printing",
          seo_description:
            "Choose the right 3D printer nozzle diameter for speed, strength, and surface finish.",
          search_keywords: ["3D printer nozzle", "0.4mm nozzle"],
          open_graph_image: {
            id: 7,
            url: "/uploads/nozzle-guide-og.jpg",
            alternativeText: "Nozzle diameter comparison",
            width: 1200,
            height: 630,
          },
        },
      ],
      meta: {
        pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 },
      },
    })

    await expect(
      generateMetadata({
        params: Promise.resolve({ slug: cmsPost.Slug }),
      })
    ).resolves.toMatchObject({
      title: "Nozzle Diameter Guide for 3D Printing",
      description:
        "Choose the right 3D printer nozzle diameter for speed, strength, and surface finish.",
      keywords: ["3D printer nozzle", "0.4mm nozzle"],
      openGraph: {
        title: "Nozzle Diameter Guide for 3D Printing",
        description:
          "Choose the right 3D printer nozzle diameter for speed, strength, and surface finish.",
        images: [
          {
            url: "https://cms.example.com/uploads/nozzle-guide-og.jpg",
            width: 1200,
            height: 630,
            alt: "Nozzle diameter comparison",
          },
        ],
      },
    })
  })
})
