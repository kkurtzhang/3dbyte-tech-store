import { render, screen } from "@testing-library/react"

import AccountLayout from "../layout"

const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock("next/navigation", () => ({
  usePathname: () => "/account",
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

jest.mock("@/app/actions/auth", () => ({
  logoutAction: jest.fn(),
}))

jest.mock("lucide-react", () => ({
  LogOut: () => <span />,
}))

describe("AccountLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("labels the root account route as Overview rather than a duplicate Profile form", () => {
    render(
      <AccountLayout>
        <div>Account content</div>
      </AccountLayout>,
    )

    expect(screen.getByRole("link", { name: /overview/i })).toHaveAttribute(
      "href",
      "/account",
    )
    expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute(
      "href",
      "/account/settings",
    )
    expect(screen.queryByRole("link", { name: /^profile$/i })).not.toBeInTheDocument()
  })
})
