import { render, screen, waitFor } from "@testing-library/react"

import { Navbar } from "../navbar"

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
  getSessionAction: jest.fn().mockResolvedValue({ success: false }),
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
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

describe("Navbar", () => {
  it("includes a visible Download Center entry", async () => {
    render(<Navbar />)

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /downloads/i })).toHaveAttribute(
        "href",
        "/downloads"
      )
    })
  })
})
