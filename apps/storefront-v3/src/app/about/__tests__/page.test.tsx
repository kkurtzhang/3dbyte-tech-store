import { render, screen } from "@testing-library/react"

import AboutPage from "../page"

import { getAboutUs } from "@/lib/strapi/content"

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  },
}))

jest.mock("@/lib/strapi/content", () => ({
  getAboutUs: jest.fn(),
}))

const mockGetAboutUs = getAboutUs as jest.MockedFunction<typeof getAboutUs>

describe("About page", () => {
  beforeEach(() => {
    mockGetAboutUs.mockReset()
  })

  it("renders CMS-managed about sections beyond timeline and team", async () => {
    mockGetAboutUs.mockResolvedValueOnce({
      data: {
        id: 1,
        documentId: "about_doc",
        Banner: [],
        OurStory: {
          id: 1,
          Title: "Our Workshop Story",
          Text: "We source practical 3D printing parts for builders who care about repeatable results.",
        },
        WhyUs: {
          id: 1,
          Title: "Why Builders Choose Us",
          Tile: [
            {
              id: 1,
              Title: "Real build knowledge",
              Text: "Advice and parts are shaped by hands-on printer work.",
            },
          ],
        },
        OurCraftsmanship: {
          id: 1,
          Title: "Checked Before It Ships",
          Text: "Critical components are reviewed so customers can build with confidence.",
        },
        Numbers: [
          {
            id: 1,
            Title: "48h",
            Text: "Target support response window.",
          },
        ],
        Timeline: [],
        Team: [],
      },
      meta: {},
    })

    render(await AboutPage())

    expect(screen.getByRole("heading", { name: "Our Workshop Story" })).toBeInTheDocument()
    expect(
      screen.getByText(
        "We source practical 3D printing parts for builders who care about repeatable results."
      )
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Why Builders Choose Us" })).toBeInTheDocument()
    expect(screen.getByText("Real build knowledge")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Checked Before It Ships" })).toBeInTheDocument()
    expect(screen.getByText("48h")).toBeInTheDocument()
    expect(screen.queryByText(/premium Voron kits/i)).not.toBeInTheDocument()
  })

  it("keeps a useful fallback when CMS is unavailable", async () => {
    mockGetAboutUs.mockRejectedValueOnce(new Error("CMS unavailable"))

    render(await AboutPage())

    expect(screen.getByRole("heading", { name: /Engineering the future/i })).toBeInTheDocument()
    expect(screen.getByText(/curated 3D printing components/i)).toBeInTheDocument()
  })
})
