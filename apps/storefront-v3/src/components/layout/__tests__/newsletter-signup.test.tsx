import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { NewsletterSignup } from "../newsletter-signup"
import { toast } from "@/lib/hooks/use-toast"

const mockToast = jest.fn()
jest.mock("@/lib/hooks/use-toast", () => ({
  toast: (...args: any[]) => mockToast(...args),
  useToast: () => ({
    toast: mockToast,
    dismiss: jest.fn(),
  }),
}))

jest.mock("@3dbyte-tech-store/shared-utils", () => ({
  validateEmail: (email: string) => email.includes("@") && email.includes("."),
}))

describe("NewsletterSignup", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it("renders subscription form and handles inputs", () => {
    render(<NewsletterSignup />)

    expect(screen.getByText("Join 3D Byte Tech Newsletter")).toBeInTheDocument()
    expect(screen.getByLabelText("First Name")).toBeInTheDocument()
    expect(screen.getByLabelText("Last Name")).toBeInTheDocument()
    expect(screen.getByLabelText("Email Address")).toBeInTheDocument()
  })

  it("renders compact mode", () => {
    render(<NewsletterSignup compact />)

    expect(screen.getByText("Stay Updated")).toBeInTheDocument()
    expect(screen.queryByLabelText("First Name")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Last Name")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Email Address")).toBeInTheDocument()
  })

  it("displays validation toast for invalid email", async () => {
    const { container } = render(<NewsletterSignup />)

    const emailInput = screen.getByLabelText("Email Address")
    fireEvent.change(emailInput, { target: { value: "invalid-email" } })

    const form = container.querySelector("form")
    if (form) {
      fireEvent.submit(form)
    }

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: "Invalid email",
      })
    )
  })

  it("submits successfully and shows success state", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ success: true }),
    }
    ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

    const { container } = render(<NewsletterSignup />)

    const emailInput = screen.getByLabelText("Email Address")
    fireEvent.change(emailInput, { target: { value: "test@example.com" } })

    const form = container.querySelector("form")
    if (form) {
      fireEvent.submit(form)
    }

    await waitFor(() => {
      expect(screen.getByText("✓ Thanks for subscribing!")).toBeInTheDocument()
    })
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Success!",
      })
    )
  })
})
