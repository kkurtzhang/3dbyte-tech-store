import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Dialog, DialogContent, DialogTitle } from "../dialog"

jest.mock("lucide-react", () => ({
  X: () => <svg data-testid="icon-x" />,
}))

describe("Dialog", () => {
  it("renders dialog content with accessible modal semantics", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Quick View</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    const dialog = screen.getByRole("dialog")

    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(dialog).toHaveTextContent("Quick View")
  })

  it("requests close when the backdrop is clicked", async () => {
    const user = userEvent.setup()
    const onOpenChange = jest.fn()

    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Quick View</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    await user.click(screen.getByTestId("dialog-backdrop"))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
