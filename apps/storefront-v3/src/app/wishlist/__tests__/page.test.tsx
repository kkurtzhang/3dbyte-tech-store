import { render, screen } from "@testing-library/react"
import { getSessionAction } from "@/app/actions/auth"
import WishlistPage from "../page"

const redirect = jest.fn()

jest.mock("@/app/actions/auth", () => ({
  getSessionAction: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirect(...args),
}))

jest.mock("../wishlist-client", () => ({
  WishlistClient: () => <div>Wishlist client</div>,
}))

const mockGetSessionAction = getSessionAction as jest.MockedFunction<
  typeof getSessionAction
>

describe("wishlist page", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("redirects signed-out customers to sign in", async () => {
    mockGetSessionAction.mockResolvedValue({ success: false, error: "No session" })

    await WishlistPage()

    expect(redirect).toHaveBeenCalledWith("/sign-in")
  })

  it("renders the wishlist client for signed-in customers", async () => {
    mockGetSessionAction.mockResolvedValue({
      success: true,
      user: { id: "cus_123", email: "test@example.com" },
    })

    render(await WishlistPage())

    expect(screen.getByText("Wishlist client")).toBeInTheDocument()
  })
})
