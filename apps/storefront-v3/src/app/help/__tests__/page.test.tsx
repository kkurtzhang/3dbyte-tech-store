import { render, screen } from "@testing-library/react"

import HelpPage from "../page"

import { getHelpCenter } from "@/lib/strapi/content"

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

jest.mock("@/features/search/components/content-search-box", () => ({
  ContentSearchBox: ({ placeholder }: { placeholder: string }) => (
    <input aria-label="Help search" placeholder={placeholder} />
  ),
}))

jest.mock("@/lib/strapi/content", () => ({
  getHelpCenter: jest.fn(),
}))

const mockGetHelpCenter = getHelpCenter as jest.MockedFunction<typeof getHelpCenter>

describe("Help page", () => {
  beforeEach(() => {
    mockGetHelpCenter.mockReset()
  })

  it("renders CMS-managed help center content when available", async () => {
    mockGetHelpCenter.mockResolvedValueOnce({
      data: {
        id: 1,
        Heading: "Customer Support Desk",
        Subheading: "Curated support paths from Strapi.",
        Categories: [
          {
            id: 1,
            Title: "Warranty Questions",
            Description: "Coverage, proof of purchase, and return windows.",
            Href: "/faq",
            Icon: "shield-check",
            Articles: [
              { id: 1, Title: "What is covered by warranty?" },
              { id: 2, Title: "How do I submit proof of purchase?" },
            ],
          },
        ],
        PopularResources: [
          {
            id: 1,
            Title: "Warranty policy",
            Category: "Warranty",
            Href: "/faq#warranty",
          },
        ],
        ContactOptions: [
          {
            id: 1,
            Title: "Workshop Support",
            Description: "Send build notes and photos.",
            Value: "support@example.com",
            Action: "Email the workshop",
            Href: "mailto:support@example.com",
            Icon: "mail",
          },
        ],
      },
      meta: {},
    })

    render(await HelpPage())

    expect(screen.getByRole("heading", { name: "Customer Support Desk" })).toBeInTheDocument()
    expect(screen.getByText("Curated support paths from Strapi.")).toBeInTheDocument()
    expect(screen.getByText("Warranty Questions")).toBeInTheDocument()
    expect(screen.getByText("What is covered by warranty?")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /warranty policy/i })).toHaveAttribute(
      "href",
      "/faq#warranty"
    )
    expect(screen.getByRole("link", { name: "Email the workshop" })).toHaveAttribute(
      "href",
      "mailto:support@example.com"
    )
  })

  it("keeps the hardcoded help fallback when CMS is unavailable", async () => {
    mockGetHelpCenter.mockRejectedValueOnce(new Error("CMS unavailable"))

    render(await HelpPage())

    expect(screen.getByRole("heading", { name: "Help Center" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Shipping" })).toBeInTheDocument()
    expect(screen.getByText("Returns and refunds")).toBeInTheDocument()
  })
})
