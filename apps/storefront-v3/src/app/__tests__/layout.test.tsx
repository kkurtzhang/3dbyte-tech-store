import type { ReactNode } from "react"
import { render, screen, waitFor } from "@testing-library/react"
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

jest.mock("@/components/layout/offline-status-banner", () => ({
  OfflineStatusBanner: () => <div data-testid="offline-status-banner" />,
}))

jest.mock("@/components/ui/toaster", () => ({
  Toaster: () => <div data-testid="toaster" />,
}))

jest.mock(
  "@/features/ai-shopping-assistant/components/shopping-assistant-drawer",
  () => ({
    ShoppingAssistantDrawer: () => (
      <div data-testid="shopping-assistant-drawer" />
    ),
  })
)

jest.mock("@/context/cart-context", () => ({
  CartProvider: ({ children }: { children: ReactNode }) => children,
}))

jest.mock("@/context/wishlist-context", () => ({
  WishlistProvider: ({ children }: { children: ReactNode }) => children,
}))

jest.mock("@/app/actions/waitlist", () => ({
  getWaitlistAction: jest.fn().mockResolvedValue({
    success: true,
    customerEmail: "",
    waitlist: [],
  }),
  addWaitlistItemAction: jest.fn(),
  removeWaitlistItemAction: jest.fn(),
  clearWaitlistAction: jest.fn(),
}))

function InventoryAlertsConsumer() {
  const { isLoading } = useInventoryAlerts()

  return <span>{isLoading ? "loading" : "ready"}</span>
}

describe("RootLayout", () => {
  it("provides inventory alerts context to app children", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})

    render(
      <RootLayout>
        <InventoryAlertsConsumer />
      </RootLayout>
    )

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeInTheDocument()
    })

    expect(screen.getByTestId("shopping-assistant-drawer")).toBeInTheDocument()
    expect(screen.getByTestId("offline-status-banner")).toBeInTheDocument()

    consoleErrorSpy.mockRestore()
  })
})
