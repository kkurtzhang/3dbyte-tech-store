import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ContactForm } from "../contact-form"

jest.mock("lucide-react", () => ({
  CheckCircle2: (props: Record<string, unknown>) => (
    <svg data-testid="check-icon" {...props} />
  ),
  Mail: (props: Record<string, unknown>) => <svg data-testid="mail-icon" {...props} />,
  Send: (props: Record<string, unknown>) => <svg data-testid="send-icon" {...props} />,
}))

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe("ContactForm", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ticket: {
          ticket_number: "3DBS-ABCD-234567",
        },
      }),
    })
  })

  it("creates a support ticket instead of opening a mailto draft", async () => {
    const user = userEvent.setup()
    render(<ContactForm />)

    await user.type(screen.getByLabelText(/^name$/i), "Ava Customer")
    await user.type(screen.getByLabelText(/^email$/i), "ava@example.com")
    await user.selectOptions(screen.getByLabelText(/^subject$/i), "Order Status")
    await user.type(screen.getByLabelText(/^message$/i), "Can you check this order?")
    await user.click(screen.getByRole("button", { name: /send message/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/support-tickets",
        expect.objectContaining({
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "Ava Customer",
            email: "ava@example.com",
            subject: "Order Status",
            category: "order_status",
            message: "Can you check this order?",
            source: "contact_form",
          }),
        })
      )
    })
    expect(await screen.findByText(/support request received/i)).toBeVisible()
    expect(screen.getByText(/3DBS-ABCD-234567/)).toBeVisible()
  })

  it("shows a retry-safe error when ticket creation fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Unable to create support ticket" }),
    })
    const user = userEvent.setup()
    render(<ContactForm />)

    await user.type(screen.getByLabelText(/^name$/i), "Ava Customer")
    await user.type(screen.getByLabelText(/^email$/i), "ava@example.com")
    await user.selectOptions(screen.getByLabelText(/^subject$/i), "Product Support")
    await user.type(screen.getByLabelText(/^message$/i), "Can you check compatibility?")
    await user.click(screen.getByRole("button", { name: /send message/i }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to create support ticket/i
    )
  })
})
