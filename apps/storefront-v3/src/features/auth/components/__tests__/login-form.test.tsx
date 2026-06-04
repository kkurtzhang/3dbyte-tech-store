import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { loginAction } from "@/app/actions/auth"

import { LoginForm } from "../login-form"

const mockRefresh = jest.fn()
const mockReplace = jest.fn()

jest.mock("@/app/actions/auth", () => ({
  loginAction: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    replace: mockReplace,
  }),
}))

jest.mock("@/components/ui/google-icon", () => ({
  GoogleIcon: () => <span />,
}))

const mockLoginAction = loginAction as jest.MockedFunction<typeof loginAction>

describe("LoginForm", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.history.replaceState({}, "", "/sign-in")
    mockLoginAction.mockResolvedValue({
      success: true,
      user: { id: "cus_123", email: "customer@example.com" },
    })
  })

  it("refreshes server-rendered UI and leaves the sign-in page after standalone login", async () => {
    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "customer@example.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    })

    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
      expect(mockReplace).toHaveBeenCalledWith("/account")
    })
  })

  it("uses a safe redirect query after standalone login", async () => {
    window.history.replaceState({}, "", "/sign-in?redirect=/account/orders")

    render(<LoginForm />)

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "customer@example.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    })

    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/account/orders")
    })
  })

  it("keeps sheet logins in place while still refreshing account state", async () => {
    const onSuccess = jest.fn()

    render(<LoginForm onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "customer@example.com" },
    })
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    })

    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
      expect(mockRefresh).toHaveBeenCalled()
    })
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
