import { fireEvent, render, screen } from "@testing-library/react"

jest.mock("lucide-react", () => ({
  Sparkles: () => <span aria-hidden="true" />,
}))

jest.mock("next/dynamic", () => () =>
  function MockAssistant({ initiallyOpen }: { initiallyOpen?: boolean }) {
    return (
      <div data-testid="assistant" data-initially-open={String(initiallyOpen)} />
    )
  }
)

import { LazyShoppingAssistant } from "../lazy-shopping-assistant"

describe("LazyShoppingAssistant", () => {
  it("loads and opens the assistant only after the customer activates it", () => {
    render(<LazyShoppingAssistant />)

    expect(screen.queryByTestId("assistant")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Shopping assistant" }))

    expect(screen.getByTestId("assistant")).toHaveAttribute(
      "data-initially-open",
      "true"
    )
  })
})
