import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { getSessionAction, logoutAction } from "@/app/actions/auth"
import { Navbar } from "../navbar"

const mockPush = jest.fn()
const mockRefresh = jest.fn()
let mockPathname = "/"

jest.mock("lucide-react", () =>
  new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "__esModule") return true
        return (props: Record<string, unknown>) => <svg {...props} />
      },
    }
  )
)

jest.mock("@/app/actions/auth", () => ({
  getSessionAction: jest.fn(),
  logoutAction: jest.fn(),
}))

jest.mock("@/context/wishlist-context", () => ({
  useWishlist: () => ({ wishlist: [] }),
}))

jest.mock("@/features/cart/components/cart-sheet", () => ({
  CartSheet: () => <button type="button">Open cart</button>,
}))

jest.mock("../mobile-menu", () => ({
  MobileMenu: () => <button type="button">Open menu</button>,
}))

jest.mock("../theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Toggle theme</button>,
}))

jest.mock("@/components/search/search-command-dialog", () => ({
  SearchCommandDialog: () => null,
}))

jest.mock("@/features/auth/components/auth-sheet", () => ({
  AuthSheet: () => null,
}))

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

const mockGetSessionAction = getSessionAction as jest.MockedFunction<
  typeof getSessionAction
>
const mockLogoutAction = logoutAction as jest.MockedFunction<typeof logoutAction>

describe("Navbar", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPathname = "/"
    mockGetSessionAction.mockResolvedValue({ success: false, error: "No session" })
    mockLogoutAction.mockResolvedValue({ success: true })
  })

  it("uses the approved brand logo as the home link", async () => {
    render(<Navbar />)

    const brandLink = screen.getByRole("link", { name: "3D Byte Tech" })

    expect(brandLink).toHaveAttribute("href", "/")
    expect(
      brandLink.querySelector(
        'img[src*="/brand/logos/logo-primary-horizontal-640w.png"]'
      )
    ).toBeInTheDocument()
    expect(screen.queryByText("The Lab")).not.toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
    })
  })

  it("includes a visible Download Center entry", async () => {
    render(<Navbar />)

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /downloads/i })).toHaveAttribute(
        "href",
        "/downloads"
      )
    })
  })

  it("hides Blog navigation until the launch flag is enabled", async () => {
    const { rerender } = render(<Navbar />)

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: /^blog$/i })).not.toBeInTheDocument()
    })

    rerender(<Navbar blogEnabled />)

    expect(screen.getByRole("link", { name: /^blog$/i })).toHaveAttribute(
      "href",
      "/blog",
    )
  })

  it("shows the signed-in customer's name as a profile menu trigger", async () => {
    mockGetSessionAction.mockResolvedValue({
      success: true,
      user: {
        id: "cus_123",
        email: "kurt@example.com",
        first_name: "Kurt",
      },
    })

    render(<Navbar />)

    const accountButton = await screen.findByRole("button", { name: /kurt/i })

    expect(accountButton).toHaveAttribute("aria-haspopup", "menu")
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument()

    fireEvent.click(accountButton)

    expect(screen.getByRole("menu", { name: /account menu/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /my account/i })).toHaveAttribute(
      "href",
      "/account",
    )
    expect(screen.getByRole("link", { name: /orders/i })).toHaveAttribute(
      "href",
      "/account/orders",
    )
    expect(screen.getByRole("link", { name: /addresses/i })).toHaveAttribute(
      "href",
      "/account/addresses",
    )
    expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute(
      "href",
      "/account/settings",
    )
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument()
  })

  it("signs out from the profile menu and refreshes account state", async () => {
    mockGetSessionAction.mockResolvedValue({
      success: true,
      user: {
        id: "cus_123",
        email: "kurt@example.com",
        first_name: "Kurt",
      },
    })

    render(<Navbar />)

    fireEvent.click(await screen.findByRole("button", { name: /kurt/i }))
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }))

    await waitFor(() => {
      expect(mockLogoutAction).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith("/")
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it("rechecks session state after navigation so external account deletion updates the menu", async () => {
    mockPathname = "/account/settings"
    mockGetSessionAction
      .mockResolvedValueOnce({
        success: true,
        user: {
          id: "cus_123",
          email: "kurt@example.com",
          first_name: "Kurt",
        },
      })
      .mockResolvedValueOnce({ success: false, error: "No session" })

    const { rerender } = render(<Navbar />)

    expect(await screen.findByRole("button", { name: /kurt/i })).toBeInTheDocument()

    mockPathname = "/"
    rerender(<Navbar />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
    })
    expect(mockGetSessionAction).toHaveBeenCalledTimes(2)
  })
})
