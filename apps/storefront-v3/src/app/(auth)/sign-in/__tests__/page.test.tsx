import { render, screen } from "@testing-library/react"

import { getSessionAction } from "@/app/actions/auth"

import SignInPage from "../page"

const mockRedirect = jest.fn()

jest.mock("@/app/actions/auth", () => ({
  getSessionAction: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}))

jest.mock("@/features/auth/components/login-form", () => ({
  LoginForm: () => <form aria-label="Sign in form" />,
}))

jest.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}))

const mockGetSessionAction = getSessionAction as jest.MockedFunction<
  typeof getSessionAction
>

describe("SignInPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("redirects signed-in customers away from the sign-in page", async () => {
    mockGetSessionAction.mockResolvedValue({
      success: true,
      user: { id: "cus_123", email: "customer@example.com" },
    })

    await SignInPage({})

    expect(mockRedirect).toHaveBeenCalledWith("/account")
  })

  it("redirects signed-in unverified customers to the verification-required page", async () => {
    mockGetSessionAction.mockResolvedValue({
      success: true,
      user: {
        id: "cus_123",
        email: "customer@example.com",
        email_verified: false,
      },
    })

    await SignInPage({})

    expect(mockRedirect).toHaveBeenCalledWith("/verify-required?source=signin")
  })

  it("renders the sign-in form for signed-out customers", async () => {
    mockGetSessionAction.mockResolvedValue({
      success: false,
      error: "No session",
    })

    render(await SignInPage({}))

    expect(
      screen.getByRole("form", { name: /sign in form/i }),
    ).toBeInTheDocument()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it("shows a visible Google sign-in error when OAuth redirects back with an error code", async () => {
    mockGetSessionAction.mockResolvedValue({
      success: false,
      error: "No session",
    })

    render(
      await SignInPage({
        searchParams: Promise.resolve({ error: "google_oauth_failed" }),
      }),
    )

    expect(
      screen.getByText(/Google sign-in could not be completed/i),
    ).toBeInTheDocument()
  })

  it("redirects signed-in customers to a safe redirect query when present", async () => {
    mockGetSessionAction.mockResolvedValue({
      success: true,
      user: { id: "cus_123", email: "customer@example.com" },
    })

    await SignInPage({
      searchParams: Promise.resolve({ redirect: "/account/orders" }),
    })

    expect(mockRedirect).toHaveBeenCalledWith("/account/orders")
  })
})
