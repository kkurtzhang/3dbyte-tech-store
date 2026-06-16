import { render, screen } from "@testing-library/react"

import { getSessionAction } from "@/app/actions/auth"

import AccountPage from "../page"

const mockRedirect = jest.fn()
const mockGetCustomerAuthHeaders = jest.fn()
const mockGetAddressesAction = jest.fn()
const mockListOrders = jest.fn()

jest.mock("@/app/actions/auth", () => ({
  getAddressesAction: () => mockGetAddressesAction(),
  getCustomerAuthHeaders: () => mockGetCustomerAuthHeaders(),
  getSessionAction: jest.fn(),
}))

jest.mock("@/lib/medusa/orders", () => ({
  listOrders: (...args: unknown[]) => mockListOrders(...args),
}))

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
  useRouter: () => ({
    replace: jest.fn(),
    refresh: jest.fn(),
    push: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock(
  "lucide-react",
  () =>
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

const mockGetSessionAction = getSessionAction as jest.MockedFunction<
  typeof getSessionAction
>

describe("AccountPage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCustomerAuthHeaders.mockResolvedValue({
      Authorization: "Bearer customer-token",
    })
    mockGetAddressesAction.mockResolvedValue({
      success: true,
      addresses: [],
    })
    mockListOrders.mockResolvedValue({
      orders: [],
      count: 0,
    })
  })

  it("redirects signed-out customers to sign in", async () => {
    mockGetSessionAction.mockResolvedValue({
      success: false,
      error: "No session",
    })

    await AccountPage({ searchParams: Promise.resolve({}) })

    expect(mockRedirect).toHaveBeenCalledWith("/sign-in")
  })

  it("renders an account overview instead of duplicate editable profile fields", async () => {
    mockGetSessionAction.mockResolvedValue({
      success: true,
      user: {
        id: "cus_123",
        email: "kurt@example.com",
        first_name: "Kurt",
        last_name: "Zhang",
        phone: "0400000000",
      },
    })

    render(await AccountPage({ searchParams: Promise.resolve({}) }))

    expect(
      screen.getByRole("heading", { name: /account overview/i }),
    ).toBeInTheDocument()
    expect(screen.getByText("Kurt Zhang")).toBeInTheDocument()
    expect(screen.getByText("kurt@example.com")).toBeInTheDocument()
    expect(screen.getByText("0400000000")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /manage profile and password/i }),
    ).toHaveAttribute("href", "/account/settings")
    expect(screen.getByRole("link", { name: /view orders/i })).toHaveAttribute(
      "href",
      "/account/orders",
    )
    expect(
      screen.getByRole("link", { name: /manage addresses/i }),
    ).toHaveAttribute("href", "/account/addresses")
    expect(
      screen.queryByRole("button", { name: /save changes/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText("First Name")).not.toBeInTheDocument()
  })

  it("renders dashboard widgets for recent order, saved address, and account readiness", async () => {
    mockGetSessionAction.mockResolvedValue({
      success: true,
      user: {
        id: "cus_123",
        email: "kurt@example.com",
        first_name: "Kurt",
        last_name: "Zhang",
        phone: "0400000000",
        email_verified: true,
      },
    })
    mockListOrders.mockResolvedValue({
      orders: [
        {
          id: "order_01KVP5KM7ZK7QB4RM4E2C9CX8T",
          custom_display_id: "3DB-42",
          display_id: 42,
          created_at: "2026-06-01T00:00:00.000Z",
          total: 125.5,
          currency_code: "aud",
        },
      ],
      count: 12,
    })
    mockGetAddressesAction.mockResolvedValue({
      success: true,
      addresses: [
        { id: "addr_1", is_default_shipping: true },
        { id: "addr_2" },
      ],
    })

    render(await AccountPage({ searchParams: Promise.resolve({}) }))

    expect(mockListOrders).toHaveBeenCalledWith(
      {
        limit: 1,
        fields: [
          "id",
          "display_id",
          "custom_display_id",
          "created_at",
          "total",
          "currency_code",
        ],
      },
      {
        Authorization: "Bearer customer-token",
      },
    )
    expect(screen.getByText("12 orders")).toBeInTheDocument()
    expect(screen.getByText(/latest 3DB-42/i)).toBeInTheDocument()
    expect(screen.getByText(/A\$125\.50/i)).toBeInTheDocument()
    expect(screen.getByText("2 saved addresses")).toBeInTheDocument()
    expect(screen.getByText(/default shipping ready/i)).toBeInTheDocument()
    expect(screen.getByText(/email verified/i)).toBeInTheDocument()
    expect(screen.getByText(/phone added/i)).toBeInTheDocument()
  })

  it("redirects unverified customers to the verification-required page", async () => {
    mockGetSessionAction.mockResolvedValue({
      success: true,
      user: {
        id: "cus_123",
        email: "kurt@example.com",
        first_name: "Kurt",
        last_name: "Zhang",
        email_verified: false,
      },
    })

    await AccountPage({
      searchParams: Promise.resolve({ registered: "1" }),
    })

    expect(mockRedirect).toHaveBeenCalledWith("/verify-required?source=account")
  })
})
