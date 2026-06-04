import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { resetPasswordAction } from "@/app/actions/auth"

import { ResetPasswordForm } from "../reset-password-form"

jest.mock("@/app/actions/auth", () => ({
  resetPasswordAction: jest.fn(),
}))

const mockResetPasswordAction = resetPasswordAction as jest.MockedFunction<
  typeof resetPasswordAction
>

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockResetPasswordAction.mockResolvedValue({ success: true })
  })

  it("submits a new password with the reset token and email", async () => {
    const user = userEvent.setup()

    render(<ResetPasswordForm email="customer@example.com" token="reset-token" />)

    await user.type(screen.getByLabelText("New password"), "Password123!")
    await user.type(screen.getByLabelText("Confirm password"), "Password123!")
    await user.click(screen.getByRole("button", { name: /reset password/i }))

    await waitFor(() => {
      expect(mockResetPasswordAction).toHaveBeenCalledWith(
        "customer@example.com",
        "reset-token",
        "Password123!"
      )
      expect(screen.getByText(/password has been reset/i)).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
        "href",
        "/sign-in"
      )
    })
  })

  it("rejects mismatched passwords before calling the reset action", async () => {
    const user = userEvent.setup()

    render(<ResetPasswordForm email="customer@example.com" token="reset-token" />)

    await user.type(screen.getByLabelText("New password"), "Password123!")
    await user.type(screen.getByLabelText("Confirm password"), "Password123?")
    await user.click(screen.getByRole("button", { name: /reset password/i }))

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })
    expect(mockResetPasswordAction).not.toHaveBeenCalled()
  })
})
