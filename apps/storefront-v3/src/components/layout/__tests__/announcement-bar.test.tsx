import { render, screen } from "@testing-library/react"

import {
  AnnouncementBar,
  type AnnouncementBarItem,
} from "../announcement-bar"

jest.mock("lucide-react", () => {
  const icon = (name: string) => (props: Record<string, unknown>) => (
    <svg data-testid={props["data-testid"] ?? name} />
  )

  return {
    BadgePercent: icon("badge-percent"),
    Bell: icon("bell"),
    Clock3: icon("clock"),
    Gift: icon("gift"),
    Package: icon("package"),
    ShieldCheck: icon("shield-check"),
    Sparkles: icon("sparkles"),
    Truck: icon("truck"),
  }
})

describe("AnnouncementBar", () => {
  const items: AnnouncementBarItem[] = [
    {
      id: 1,
      Text: "Free shipping over $149",
      Icon: "truck",
      Link: "/shipping",
    },
    {
      id: 2,
      Text: "New Voron kits in stock",
      Icon: "package",
    },
  ]

  it("renders nothing when there are no announcement items", () => {
    const { container } = render(<AnnouncementBar items={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("duplicates announcement items for marquee continuity", () => {
    render(<AnnouncementBar items={items} />)

    expect(screen.getAllByText("Free shipping over $149")).toHaveLength(2)
    expect(screen.getAllByText("New Voron kits in stock")).toHaveLength(2)
  })

  it("renders icon output for supported icon keys", () => {
    render(<AnnouncementBar items={items} />)

    expect(screen.getAllByTestId("announcement-icon-truck")).toHaveLength(2)
    expect(screen.getAllByTestId("announcement-icon-package")).toHaveLength(2)
  })

  it("falls back to plain text when an item has no link", () => {
    render(<AnnouncementBar items={items} />)

    expect(screen.getAllByText("New Voron kits in stock")[0].closest("a")).toBeNull()
  })

  it("renders links when an announcement provides a destination", () => {
    render(<AnnouncementBar items={items} />)

    expect(screen.getAllByRole("link", { name: /free shipping over \$149/i })[0]).toHaveAttribute(
      "href",
      "/shipping"
    )
  })
})
