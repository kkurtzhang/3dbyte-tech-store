import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { deleteAccountAction } from "@/app/actions/auth"
import { navigateTo } from "@/lib/browser/navigation"
import { SettingsContent } from "../settings-client"

const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock("@/app/actions/auth", () => ({
  changePasswordAction: jest.fn(),
  deleteAccountAction: jest.fn(),
  updateProfileAction: jest.fn(),
}))

jest.mock("@/lib/browser/navigation", () => ({
  navigateTo: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

jest.mock("lucide-react", () =>
  new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "__esModule") return true
        return (props: Record<string, unknown>) => <svg {...props} />
      },
    },
  ),
)

const mockDeleteAccountAction = deleteAccountAction as jest.MockedFunction<
  typeof deleteAccountAction
>
const mockNavigateTo = navigateTo as jest.MockedFunction<typeof navigateTo>

describe("SettingsContent", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDeleteAccountAction.mockResolvedValue({ success: true })
  })

  it("uses an Australian phone number placeholder", () => {
    render(
      <SettingsContent
        customer={{
          id: "cus_123",
          email: "kurt@example.com",
          first_name: "Kurt",
          last_name: "Zhang",
        }}
      />,
    )

    expect(screen.getByLabelText("Phone Number")).toHaveAttribute(
      "placeholder",
      "0400 000 000",
    )
  })

  it("shows a Google connect action when Google is not linked", () => {
    render(
      <SettingsContent
        customer={{
          id: "cus_123",
          email: "kurt@example.com",
          first_name: "Kurt",
          last_name: "Zhang",
        }}
        loginMethods={{
          emailpass: true,
          google: false,
          providers: ["emailpass"],
        }}
      />,
    )

    expect(screen.getByText("Login Methods")).toBeInTheDocument()
    expect(screen.getByText("Google")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /connect google/i }))

    expect(mockNavigateTo).toHaveBeenCalledWith(
      "/auth/google/start?mode=link&redirect=%2Faccount%2Fsettings",
    )
  })

  it("shows Google as connected without offering a duplicate connect action", () => {
    render(
      <SettingsContent
        customer={{
          id: "cus_123",
          email: "kurt@example.com",
          first_name: "Kurt",
          last_name: "Zhang",
        }}
        loginMethods={{
          emailpass: true,
          google: true,
          providers: ["emailpass", "google"],
        }}
      />,
    )

    expect(screen.getAllByText("Connected")).toHaveLength(2)
    expect(
      screen.queryByRole("button", { name: /connect google/i }),
    ).not.toBeInTheDocument()
  })

  it("refreshes the app shell after deleting the account so navigation shows signed-out state", async () => {
    render(
      <SettingsContent
        customer={{
          id: "cus_123",
          email: "kurt@example.com",
          first_name: "Kurt",
          last_name: "Zhang",
        }}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /^delete account$/i }))
    fireEvent.click(screen.getByRole("button", { name: /yes, delete my account/i }))

    await waitFor(() => {
      expect(mockDeleteAccountAction).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith("/")
      expect(mockRefresh).toHaveBeenCalled()
    })
  })
})
