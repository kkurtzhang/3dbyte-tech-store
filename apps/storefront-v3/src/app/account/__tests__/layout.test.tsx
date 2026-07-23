import { readFileSync } from "node:fs"
import path from "node:path"
import { fireEvent, render, screen } from "@testing-library/react"

import { getSessionAction } from "@/app/actions/auth"
import { AccountShellSkeleton } from "@/components/loading/storefront-page-skeletons"

import { AccountAccessBoundary } from "../layout"
import { AccountNav } from "../account-nav"

const mockPush = jest.fn()
const mockRefresh = jest.fn()
const mockRedirect = jest.fn()

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
  usePathname: () => "/account",
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

jest.mock("@/app/actions/auth", () => ({
  getSessionAction: jest.fn(),
  logoutAction: jest.fn(),
}))

jest.mock("lucide-react", () => ({
  LogOut: () => <span />,
}))

const mockGetSessionAction = getSessionAction as jest.MockedFunction<
  typeof getSessionAction
>

describe("AccountNav", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSessionAction.mockResolvedValue({
      success: true,
      user: {
        id: "cus_123",
        email: "customer@example.com",
        email_verified: true,
      },
    })
  })

  it("labels the root account route as Overview rather than a duplicate Profile form", () => {
    render(<AccountNav />)

    expect(screen.getByRole("link", { name: /overview/i })).toHaveAttribute(
      "href",
      "/account",
    )
    expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute(
      "href",
      "/account/settings",
    )
    expect(
      screen.queryByRole("link", { name: /^profile$/i }),
    ).not.toBeInTheDocument()
  })

  it("uses client-side routing for the mobile account selector", () => {
    render(<AccountNav />)

    fireEvent.change(screen.getByLabelText(/navigate account sections/i), {
      target: { value: "/account/orders" },
    })

    expect(mockPush).toHaveBeenCalledWith("/account/orders")
  })

  it("gates account pages for signed-in customers who have not verified email ownership", async () => {
    mockGetSessionAction.mockResolvedValueOnce({
      success: true,
      user: {
        id: "cus_pending",
        email: "pending@example.com",
        email_verified: false,
      },
    })

    await AccountAccessBoundary({ children: <div>Account content</div> })

    expect(mockRedirect).toHaveBeenCalledWith("/verify-required?source=account")
  })

  it("wraps session access with an accessible account shell fallback", () => {
    const source = readFileSync(path.resolve(__dirname, "../layout.tsx"), "utf8")

    expect(source).toContain("<Suspense fallback={<AccountShellSkeleton />}>")

    render(<AccountShellSkeleton />)

    expect(
      screen.getByRole("status", { name: /loading account/i }),
    ).toBeInTheDocument()
  })
})
