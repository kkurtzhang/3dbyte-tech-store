import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { RegisterForm } from "../register-form"

const mockPush = jest.fn()
const mockRegisterAction = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
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
})
