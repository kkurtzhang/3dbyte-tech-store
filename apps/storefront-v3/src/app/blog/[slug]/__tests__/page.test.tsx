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
  beforeEach(() => {
    mockGetBlogPostBySlug.mockReset()
    mockGetMDXPost.mockReset()
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
})
