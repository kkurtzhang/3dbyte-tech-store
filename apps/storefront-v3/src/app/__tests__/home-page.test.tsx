import { render, screen } from "@testing-library/react"

import Home from "../page"

import { getFeaturedCollections } from "@/lib/medusa/collections"
import { getPricingContext } from "@/lib/medusa/regions.server"
import { searchProducts } from "@/lib/search/products"
import { getCollectionDescriptions, getHomepage } from "@/lib/strapi/content"

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ fill, priority, ...props }: Record<string, unknown>) => {
    void fill
    void priority

    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  },
}))

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

jest.mock("@/features/collections/components/collection-grid", () => ({
  CollectionGrid: () => <div>Featured collection grid</div>,
  CollectionsSkeleton: () => <div>Loading collections</div>,
}))

jest.mock("@/features/product/components/product-card", () => ({
  ProductCard: ({ title }: { title: string }) => <article>{title}</article>,
}))

jest.mock("@/lib/medusa/collections", () => ({
  getFeaturedCollections: jest.fn(),
}))

jest.mock("@/lib/medusa/regions.server", () => ({
  getPricingContext: jest.fn(),
}))

jest.mock("@/lib/search/products", () => ({
  searchProducts: jest.fn(),
}))

jest.mock("@/lib/strapi/content", () => ({
  getCollectionDescriptions: jest.fn(),
  getHomepage: jest.fn(),
}))

const mockGetFeaturedCollections = getFeaturedCollections as jest.MockedFunction<
  typeof getFeaturedCollections
>
const mockGetPricingContext = getPricingContext as jest.MockedFunction<typeof getPricingContext>
const mockSearchProducts = searchProducts as jest.MockedFunction<typeof searchProducts>
const mockGetCollectionDescriptions = getCollectionDescriptions as jest.MockedFunction<
  typeof getCollectionDescriptions
>
const mockGetHomepage = getHomepage as jest.MockedFunction<typeof getHomepage>

function mockCommerceData() {
  mockGetPricingContext.mockResolvedValue({
    region_id: "reg_au",
    currency_code: "aud",
  })
  mockSearchProducts.mockResolvedValue({
    products: [
      {
        id: "prod_1",
        handle: "nozzle-pack",
        title: "Nozzle Pack",
        thumbnail: "",
        price: 1299,
        currency_code: "aud",
        on_sale: false,
      },
    ],
    totalCount: 1,
    error: false,
  })
  mockGetFeaturedCollections.mockResolvedValue([
    {
      id: "pcol_1",
      handle: "hotends",
      title: "Hotends",
    },
  ])
  mockGetCollectionDescriptions.mockResolvedValue({
    data: [],
    meta: {},
  })
}

describe("Home page", () => {
  beforeEach(() => {
    mockGetFeaturedCollections.mockReset()
    mockGetPricingContext.mockReset()
    mockSearchProducts.mockReset()
    mockGetCollectionDescriptions.mockReset()
    mockGetHomepage.mockReset()
    mockCommerceData()
  })

  it("renders CMS-managed homepage sections and the hero image", async () => {
    mockGetHomepage.mockResolvedValue({
      data: {
        id: 1,
        HeroBanner: {
          id: 1,
          Eyebrow: "3D BYTE TECH",
          Headline: "Built for reliable printing.",
          Text: "Practical parts and materials for serious print work.",
          CTA: { id: 1, BtnText: "Shop parts", BtnLink: "/shop" },
          SecondaryCTA: { id: 2, BtnText: "Read guides", BtnLink: "/guides" },
          FeatureTags: [{ id: 1, Text: "HOTENDS" }],
          Image: {
            id: 1,
            url: "https://3dbyte-tech-dev-store-cms.s3.ap-southeast-2.amazonaws.com/hero.jpg",
            alternativeText: "Precision hero",
            width: 1200,
            height: 900,
          },
        },
        MidBanner: null,
        CollectionsSection: {
          id: 1,
          Enabled: true,
          Eyebrow: "Collections",
          Heading: "Shop By Printer Job",
          Text: "Find parts by the work you are doing.",
          CTA: { id: 3, BtnText: "All collections", BtnLink: "/collections" },
        },
        ProductsSection: {
          id: 1,
          Enabled: true,
          Eyebrow: "Fresh stock",
          Heading: "Fresh Components",
          Text: "Recently indexed products from the catalogue.",
          CTA: { id: 4, BtnText: "All products", BtnLink: "/shop" },
        },
        GuidesHelpSection: {
          id: 1,
          Enabled: true,
          Eyebrow: "Support",
          Heading: "Guides and Support",
          Text: "Help customers find resources before and after purchase.",
          Cards: [
            {
              id: 1,
              Eyebrow: "Learn",
              Icon: "book-open",
              Link: "/guides",
              LinkText: "Read guides",
              Text: "Build notes and practical tutorials.",
              Title: "Workshop Guides",
            },
            {
              id: 2,
              Eyebrow: "Support",
              Icon: "message-circle",
              Link: "/help",
              LinkText: "Ask for help",
              Text: "Support routes for orders and product questions.",
              Title: "Help Center",
            },
          ],
        },
        SupportStrip: {
          id: 1,
          Enabled: true,
          Label: "Need help choosing parts?",
          Text: "Send us your printer model and build goal.",
          CTA: { id: 5, BtnText: "Contact support", BtnLink: "/contact" },
        },
        QuickLinks: [],
        TrustStats: [],
        AnnouncementBarItems: [],
      },
      meta: {},
    } as Awaited<ReturnType<typeof getHomepage>>)

    render(await Home())

    expect(screen.getByAltText("Precision hero")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Shop By Printer Job" })).toBeInTheDocument()
    expect(screen.getByText("Find parts by the work you are doing.")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Fresh Components" })).toBeInTheDocument()
    expect(screen.getByText("Nozzle Pack")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Guides and Support" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /workshop guides/i })).toHaveAttribute(
      "href",
      "/guides"
    )
    expect(screen.getByText("Need help choosing parts?")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /contact support/i })).toHaveAttribute(
      "href",
      "/contact"
    )
  })

  it("uses current non-Voron fallback copy when CMS homepage content is unavailable", async () => {
    mockGetHomepage.mockRejectedValue(new Error("CMS unavailable"))

    render(await Home())

    expect(screen.getByText(/curated 3D printing components/i)).toBeInTheDocument()
    expect(screen.queryByText(/Voron/i)).not.toBeInTheDocument()
  })

  it("keeps the homepage shell when commerce services are unavailable", async () => {
    mockGetPricingContext.mockRejectedValueOnce(new Error("Medusa unavailable"))
    mockGetFeaturedCollections.mockRejectedValueOnce(new Error("Collections unavailable"))
    mockGetHomepage.mockRejectedValue(new Error("CMS unavailable"))

    render(await Home())

    expect(screen.getByText(/curated 3D printing components/i)).toBeInTheDocument()
    expect(screen.getByText("Unable to load products")).toBeInTheDocument()
  })
})
