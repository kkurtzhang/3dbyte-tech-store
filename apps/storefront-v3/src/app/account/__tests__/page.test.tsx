import { render, screen } from "@testing-library/react"

import { getSessionAction } from "@/app/actions/auth"

import AccountPage from "../page"

const mockRedirect = jest.fn()

jest.mock("@/app/actions/auth", () => ({
  getSessionAction: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}))

const mockGetSessionAction = getSessionAction as jest.MockedFunction<
  typeof getSessionAction
>

describe("AccountPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("redirects signed-out customers to sign in", async () => {
    mockGetSessionAction.mockResolvedValue({
      success: false,
      error: "No session",
    })

    await AccountPage()

    expect(mockRedirect).toHaveBeenCalledWith("/sign-in")
  })

  it("renders an account overview instead of duplicate editable profile fields", async () => {
    mockGetSessionAction.mockResolvedValue({
      success: true,
      user: {
        id: "cus_123",
        email: "kurt@example.com",
        first_name: "Kurt",
        last_name: "Zhang",
        phone: "0400000000",
      },
    })

    render(await AccountPage())

    expect(
      screen.getByRole("heading", { name: /account overview/i }),
    ).toBeInTheDocument()
    expect(screen.getByText("Kurt Zhang")).toBeInTheDocument()
    expect(screen.getByText("kurt@example.com")).toBeInTheDocument()
    expect(screen.getByText("0400000000")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /manage profile and password/i }))
      .toHaveAttribute("href", "/account/settings")
    expect(screen.getByRole("link", { name: /view orders/i })).toHaveAttribute(
      "href",
      "/account/orders",
    )
    expect(screen.getByRole("link", { name: /manage addresses/i }))
      .toHaveAttribute("href", "/account/addresses")
    expect(
      screen.queryByRole("button", { name: /save changes/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText("First Name")).not.toBeInTheDocument()
  })
})
