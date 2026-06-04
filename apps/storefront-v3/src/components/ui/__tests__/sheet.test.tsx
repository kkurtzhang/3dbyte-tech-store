import { isToastOutsideInteractionTarget } from "../sheet"

jest.mock("lucide-react", () => ({
  X: () => <svg data-testid="icon-x" />,
}))

describe("Sheet toast outside interactions", () => {
  it("recognizes toast targets so sheets can stay open while a toast is closed", () => {
    const toastRoot = document.createElement("div")
    toastRoot.dataset.toastRoot = "true"
    const closeButton = document.createElement("button")
    toastRoot.appendChild(closeButton)

    expect(isToastOutsideInteractionTarget(closeButton)).toBe(true)
  })

  it("does not classify ordinary outside targets as toast interactions", () => {
    const outsideButton = document.createElement("button")

    expect(isToastOutsideInteractionTarget(outsideButton)).toBe(false)
  })
})
