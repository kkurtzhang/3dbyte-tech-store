import { render, screen } from "@testing-library/react"

import { HomepageHero } from "../homepage-hero"

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, src }: { alt: string; src: string }) => (
    <img alt={alt} src={src} />
  ),
}))

jest.mock("next/link", () => {
  return ({ children, href, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
})

jest.mock("lucide-react", () => ({
  ArrowUpRight: () => <span data-testid="arrow-up-right" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
}))

describe("HomepageHero", () => {
  it("renders hero copy, trust stats, and CMS hero media", () => {
    const expectedBaseUrl =
      process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337"

    render(
      <HomepageHero
        hero={{
          id: 1,
          Eyebrow: "BUILT FOR MAKERS",
          Headline: "A better way to enter the catalog.",
          Text: "Use structured merchandising instead of dead-end browsing.",
          CTA: {
            id: 1,
            BtnText: "Browse Shop",
            BtnLink: "/shop",
          },
          SecondaryCTA: {
            id: 2,
            BtnText: "View Brands",
            BtnLink: "/brands",
          },
          FeatureTags: [
            { id: 1, Text: "FILAMENT" },
            { id: 2, Text: "HARDWARE" },
          ],
          Image: {
            id: 10,
            url: "/uploads/home-hero.jpg",
            alternativeText: "Homepage hero",
            width: 1200,
            height: 1500,
          },
        }}
        trustStats={[
          { id: 1, Label: "Dispatch", Value: "24H" },
          { id: 2, Label: "Support", Value: "Local" },
        ]}
      />
    )

    expect(screen.getByText("BUILT FOR MAKERS")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "A better way to enter the catalog." })
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Browse Shop" })).toHaveAttribute(
      "href",
      "/shop"
    )
    expect(screen.getByRole("img", { name: "Homepage hero" })).toHaveAttribute(
      "src",
      `${expectedBaseUrl}/uploads/home-hero.jpg`
    )
    expect(screen.getByText("24H")).toBeInTheDocument()
    expect(screen.getByText("Local")).toBeInTheDocument()
  })

  it("renders the fallback visual when no hero image is configured", () => {
    render(
      <HomepageHero
        hero={{
          id: 1,
          Headline: "Fallback hero",
        }}
        trustStats={[]}
      />
    )

    expect(
      screen.getByText("Better rails, fewer dead ends, clearer buying paths.")
    ).toBeInTheDocument()
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })
})
