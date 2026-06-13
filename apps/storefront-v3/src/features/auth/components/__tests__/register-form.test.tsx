import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { RegisterForm } from "../register-form"

const mockPush = jest.fn()
const mockRefresh = jest.fn()
const mockRegisterAction = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

jest.mock("@/app/actions/auth", () => ({
  registerAction: (...args: unknown[]) => mockRegisterAction(...args),
}))

describe("RegisterForm", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.history.replaceState({}, "", "/sign-up")
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("rejects weak passwords before submitting registration", async () => {
    const user = userEvent.setup()

    render(<RegisterForm />)

    await user.type(screen.getByLabelText(/first name/i), "Ava")
    await user.type(screen.getByLabelText(/last name/i), "Maker")
    await user.type(screen.getByLabelText(/^email$/i), "ava@example.com")
    await user.type(screen.getByLabelText(/^password$/i), "password")
    await user.type(screen.getByLabelText(/confirm password/i), "password")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/uppercase/i)).toBeInTheDocument()
    })
    expect(mockRegisterAction).not.toHaveBeenCalled()
  })

  it("redirects to the verification-required page after successful signup", async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    mockRegisterAction.mockResolvedValueOnce({
      success: true,
      requiresEmailVerification: true,
      user: {
        id: "cus_123",
        email: "ava@example.com",
        email_verified: false,
      },
    })

    render(<RegisterForm />)

    await user.type(screen.getByLabelText(/first name/i), "Ava")
    await user.type(screen.getByLabelText(/last name/i), "Maker")
    await user.type(screen.getByLabelText(/^email$/i), "ava@example.com")
    await user.type(screen.getByLabelText(/^password$/i), "Password123!")
    await user.type(screen.getByLabelText(/confirm password/i), "Password123!")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/verification email/i)).toBeInTheDocument()
    })

    jest.advanceTimersByTime(2000)

    expect(mockPush).toHaveBeenCalledWith("/verify-required?source=registered")
  })

  it("preserves a safe post-verification redirect on the verification-required page", async () => {
    jest.useFakeTimers()
    window.history.replaceState({}, "", "/sign-up?redirect=/checkout")
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    mockRegisterAction.mockResolvedValueOnce({
      success: true,
      requiresEmailVerification: true,
      user: {
        id: "cus_123",
        email: "ava@example.com",
        email_verified: false,
      },
    })

    render(<RegisterForm />)

    await user.type(screen.getByLabelText(/first name/i), "Ava")
    await user.type(screen.getByLabelText(/last name/i), "Maker")
    await user.type(screen.getByLabelText(/^email$/i), "ava@example.com")
    await user.type(screen.getByLabelText(/^password$/i), "Password123!")
    await user.type(screen.getByLabelText(/confirm password/i), "Password123!")
    await user.click(screen.getByRole("button", { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/verification email/i)).toBeInTheDocument()
    })

    jest.advanceTimersByTime(2000)

    expect(mockPush).toHaveBeenCalledWith(
      "/verify-required?source=registered&redirect=%2Fcheckout",
    )
  })
})
