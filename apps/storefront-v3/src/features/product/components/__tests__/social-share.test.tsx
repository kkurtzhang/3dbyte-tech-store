import { render, screen } from "@testing-library/react"
import { SocialShare } from "../social-share"

jest.mock("@/lib/hooks/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}))

jest.mock("lucide-react", () => ({
  Check: () => <span data-testid="icon-check" />,
  Facebook: () => <span data-testid="icon-facebook" />,
  Link2: () => <span data-testid="icon-link" />,
  Linkedin: () => <span data-testid="icon-linkedin" />,
  MessageCircle: () => <span data-testid="icon-pinterest" />,
  Twitter: () => <span data-testid="icon-twitter" />,
}))

describe("SocialShare", () => {
  it("keeps the default full product-share presentation", () => {
    render(<SocialShare productTitle="PLA Pro" productUrl="https://example.com/products/pla-pro" />)

    expect(screen.getByText("Share Product")).toBeInTheDocument()
    expect(screen.getByTitle("Share on Facebook")).toBeInTheDocument()
    expect(screen.getByTitle("Copy Link")).toBeInTheDocument()
  })

  it("renders a compact header presentation for PDP identity areas", () => {
    render(
      <SocialShare
        productTitle="PLA Pro"
        productUrl="https://example.com/products/pla-pro"
        variant="compact"
      />
    )

    expect(screen.getByRole("group", { name: "Share product" })).toBeInTheDocument()
    expect(screen.getByText("Share")).toBeInTheDocument()
    expect(screen.queryByText("Share Product")).not.toBeInTheDocument()
    expect(screen.getByTitle("Share on Facebook")).toBeInTheDocument()
    expect(screen.getByTitle("Copy Link")).toBeInTheDocument()
  })
})
