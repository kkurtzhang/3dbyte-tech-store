import {
  stopToastInteractionPropagation,
  toastViewportClassName,
} from "../toast"

jest.mock("lucide-react", () => ({
  X: () => <svg data-testid="icon-x" />,
}))

describe("Toast", () => {
  it("keeps the desktop viewport away from the right-side cart sheet", () => {
    expect(toastViewportClassName).toContain("sm:left-4")
    expect(toastViewportClassName).toContain("sm:right-auto")
    expect(toastViewportClassName).not.toContain("sm:right-0")
  })

  it("stops close interactions from bubbling into parent overlays", () => {
    const event = {
      stopPropagation: jest.fn(),
    }

    stopToastInteractionPropagation(event)

    expect(event.stopPropagation).toHaveBeenCalledTimes(1)
  })
})
