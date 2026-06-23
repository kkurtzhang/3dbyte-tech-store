import { fireEvent, render, screen } from "@testing-library/react"

import { PromotionCodeButton } from "../promotion-code-button"

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

describe("PromotionCodeButton", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    })
  })

  it("copies the promotion code and confirms the action", async () => {
    render(<PromotionCodeButton code="PETG10" />)

    fireEvent.click(screen.getByRole("button", { name: "Copy promo code PETG10" }))

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("PETG10")
    expect(await screen.findByText("Copied")).toBeInTheDocument()
  })
})
