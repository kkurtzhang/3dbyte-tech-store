import { render, screen } from "@testing-library/react"

import { getSessionAction } from "@/app/actions/auth"

import VerifyRequiredPage from "../page"

const mockRedirect = jest.fn()

jest.mock("@/app/actions/auth", () => ({
  getSessionAction: jest.fn(),
  logoutAction: jest.fn(),
  resendVerificationEmailAction: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}))

jest.mock("lucide-react", () => ({
  Loader2: () => <span />,
  LogOut: () => <span />,
  Mail: () => <span />,
  MailCheck: () => <span />,
}))

const mockGetSessionAction = getSessionAction as jest.MockedFunction<
  typeof getSessionAction
>

describe("VerifyRequiredPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("shows registration verification guidance for unverified sessions", async () => {
    mockGetSessionAction.mockResolvedValue({
      success: true,
      user: {
        id: "cus_pending",
        email: "pending@example.com",
        email_verified: false,
      },
    })

    render(
      await VerifyRequiredPage({
        searchParams: Promise.resolve({ source: "registered" }),
      }),
    )

    expect(
      screen.getByRole("heading", { name: /account created/i }),
    ).toBeInTheDocument()
    expect(screen.getByText("pending@example.com")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /resend email/i }),
    ).toBeInTheDocument()
  })

  it("redirects signed-out visitors to sign in", async () => {
    mockGetSessionAction.mockResolvedValue({
      success: false,
      error: "No session",
    })

    await VerifyRequiredPage({ searchParams: Promise.resolve({}) })

    expect(mockRedirect).toHaveBeenCalledWith("/sign-in")
  })

  it("redirects verified customers to their intended next page", async () => {
    mockGetSessionAction.mockResolvedValue({
      success: true,
      user: {
        id: "cus_verified",
        email: "verified@example.com",
        email_verified: true,
      },
    })

    await VerifyRequiredPage({
      searchParams: Promise.resolve({ redirect: "/checkout" }),
    })

    expect(mockRedirect).toHaveBeenCalledWith("/checkout")
  })
})
