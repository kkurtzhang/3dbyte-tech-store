import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import RootLayout from "../layout"
import { useInventoryAlerts } from "@/context/inventory-alert-context"

jest.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-sans" }),
  JetBrains_Mono: () => ({ variable: "--font-mono" }),
}))

jest.mock("@/components/providers/theme-provider", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
}))

jest.mock("nuqs/adapters/next/app", () => ({
  NuqsAdapter: ({ children }: { children: ReactNode }) => children,
}))

jest.mock("@/components/layout/navbar", () => ({
  Navbar: () => <div data-testid="navbar" />,
}))

jest.mock("@/components/layout/footer", () => ({
  Footer: () => <div data-testid="footer" />,
}))

jest.mock("@/components/layout/announcement-bar-slot", () => ({
  AnnouncementBarSlot: () => <div data-testid="announcement-bar-slot" />,
}))

jest.mock("@/components/ui/toaster", () => ({
  Toaster: () => <div data-testid="toaster" />,
}))

jest.mock("@/context/cart-context", () => ({
  CartProvider: ({ children }: { children: ReactNode }) => children,
}))

jest.mock("@/context/wishlist-context", () => ({
  WishlistProvider: ({ children }: { children: ReactNode }) => children,
}))

jest.mock("@/context/compare-context", () => ({
  CompareProvider: ({ children }: { children: ReactNode }) => children,
}))

function InventoryAlertsConsumer() {
  const { isLoading } = useInventoryAlerts()

  return <span>{isLoading ? "loading" : "ready"}</span>
}

describe("RootLayout", () => {
  it("provides inventory alerts context to app children", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})

    render(
      <RootLayout>
        <InventoryAlertsConsumer />
      </RootLayout>
    )

    expect(screen.getByText(/loading|ready/)).toBeInTheDocument()

    consoleErrorSpy.mockRestore()
  })
})
