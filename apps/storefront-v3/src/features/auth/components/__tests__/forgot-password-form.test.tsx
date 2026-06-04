import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { requestPasswordResetAction } from "@/app/actions/auth"

import { ForgotPasswordForm } from "../forgot-password-form"

jest.mock("@/app/actions/auth", () => ({
  requestPasswordResetAction: jest.fn(),
}))

const mockRequestPasswordResetAction =
  requestPasswordResetAction as jest.MockedFunction<
    typeof requestPasswordResetAction
  >

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequestPasswordResetAction.mockResolvedValue({ success: true })
  })

  it("requests a reset link and shows account-enumeration-safe copy", async () => {
    const user = userEvent.setup()

    render(<ForgotPasswordForm />)

    await user.type(screen.getByLabelText("Email"), "customer@example.com")
    await user.click(screen.getByRole("button", { name: /send reset link/i }))

    await waitFor(() => {
      expect(mockRequestPasswordResetAction).toHaveBeenCalledWith(
        "customer@example.com"
      )
      expect(screen.getByText(/if an account exists/i)).toBeInTheDocument()
    })
  })

  it("rejects invalid email before calling the reset action", async () => {
    const user = userEvent.setup()

    render(<ForgotPasswordForm />)

    const input = screen.getByLabelText("Email")
    await user.type(input, "not-an-email")
    fireEvent.submit(input.closest("form")!)

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
    expect(mockRequestPasswordResetAction).not.toHaveBeenCalled()
  })
})
