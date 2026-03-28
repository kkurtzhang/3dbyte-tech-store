import { render, screen } from "@testing-library/react"

import { HomepageLinkCardGrid } from "../homepage-link-card-grid"

jest.mock("next/link", () => {
  return ({ children, href, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
})

jest.mock("lucide-react", () => {
  const icon = (name: string) => () => <span data-testid={`icon-${name}`} />

  return {
    ArrowUpRight: icon("arrow-up-right"),
    BookOpen: icon("book-open"),
    Package: icon("package"),
    ShieldCheck: icon("shield-check"),
    Sparkles: icon("sparkles"),
    Store: icon("store"),
    Truck: icon("truck"),
    Wrench: icon("wrench"),
  }
})

describe("HomepageLinkCardGrid", () => {
  it("renders linked cards with their copy and icon output", () => {
    render(
      <HomepageLinkCardGrid
        items={[
          {
            id: 1,
            eyebrow: "GUIDES",
            title: "Choose the right material",
            text: "Start with the basics before you buy.",
            linkText: "Read guide",
            link: "/guides/materials",
            icon: "book-open",
          },
          {
            id: 2,
            eyebrow: "SUPPORT",
            title: "Check shipping first",
            text: "Review dispatch timing and service coverage.",
            linkText: "Open shipping",
            link: "/shipping",
            icon: "truck",
          },
        ]}
      />
    )

    expect(screen.getByRole("link", { name: /choose the right material/i })).toHaveAttribute(
      "href",
      "/guides/materials"
    )
    expect(screen.getByRole("link", { name: /check shipping first/i })).toHaveAttribute(
      "href",
      "/shipping"
    )
    expect(screen.getByText("Read guide")).toBeInTheDocument()
    expect(screen.getByText("Open shipping")).toBeInTheDocument()
    expect(screen.getByTestId("icon-book-open")).toBeInTheDocument()
    expect(screen.getByTestId("icon-truck")).toBeInTheDocument()
  })
})
