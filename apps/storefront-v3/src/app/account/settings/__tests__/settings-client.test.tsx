import { render, screen } from "@testing-library/react"

import { SettingsContent } from "../settings-client"

jest.mock("@/app/actions/auth", () => ({
  changePasswordAction: jest.fn(),
  deleteAccountAction: jest.fn(),
  updateProfileAction: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
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

describe("SettingsContent", () => {
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
})
