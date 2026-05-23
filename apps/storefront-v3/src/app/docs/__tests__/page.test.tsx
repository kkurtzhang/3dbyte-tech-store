import { render, screen } from "@testing-library/react"

import DocsPage from "../page"

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

describe("Resource Center page", () => {
  it("repurposes the old docs route into a customer resource hub", () => {
    render(<DocsPage />)

    expect(
      screen.getByRole("heading", { name: /resource center/i })
    ).toBeInTheDocument()
    expect(screen.queryByText(/api reference/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/storefront requests require/i)).not.toBeInTheDocument()

    expect(screen.getByRole("link", { name: /download center/i })).toHaveAttribute(
      "href",
      "/downloads"
    )
    expect(screen.getByRole("link", { name: /3d printing guides/i })).toHaveAttribute(
      "href",
      "/guides"
    )
    expect(screen.getByRole("link", { name: /help center/i })).toHaveAttribute(
      "href",
      "/help"
    )
  })
})
