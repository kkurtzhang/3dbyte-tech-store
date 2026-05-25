import { render, screen } from "@testing-library/react"
import { getSessionAction } from "@/app/actions/auth"
import WaitlistPage from "../page"

const redirect = jest.fn()

jest.mock("@/app/actions/auth", () => ({
  getSessionAction: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirect(...args),
}))

jest.mock("../waitlist-client", () => ({
  WaitlistClient: () => <div>Waitlist client</div>,
}))

const mockGetSessionAction = getSessionAction as jest.MockedFunction<
  typeof getSessionAction
>

describe("waitlist page", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("redirects signed-out customers to sign in", async () => {
    mockGetSessionAction.mockResolvedValue({ success: false, error: "No session" })

    await WaitlistPage()

    expect(redirect).toHaveBeenCalledWith("/sign-in")
  })

  it("renders the waitlist client for signed-in customers", async () => {
    mockGetSessionAction.mockResolvedValue({
      success: true,
      user: { id: "cus_123", email: "test@example.com" },
    })

    render(await WaitlistPage())

    expect(screen.getByText("Waitlist client")).toBeInTheDocument()
  })
})
