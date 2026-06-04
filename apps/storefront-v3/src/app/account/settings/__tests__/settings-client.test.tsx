import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { deleteAccountAction } from "@/app/actions/auth"
import { SettingsContent } from "../settings-client"

const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock("@/app/actions/auth", () => ({
  changePasswordAction: jest.fn(),
  deleteAccountAction: jest.fn(),
  updateProfileAction: jest.fn(),
}))

jest.mock("next/navigation", () => ({
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
