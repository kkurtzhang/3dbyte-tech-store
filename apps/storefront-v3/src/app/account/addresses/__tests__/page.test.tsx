import { render, screen } from "@testing-library/react"
import React from "react"

import AddressesPage from "../page"

const mockGetSessionAction = jest.fn()
const mockGetAddressesAction = jest.fn()

jest.mock("@/app/actions/auth", () => ({
  deleteAddressAction: jest.fn(),
  getAddressesAction: () => mockGetAddressesAction(),
  getSessionAction: () => mockGetSessionAction(),
  setDefaultAddressAction: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}))

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

jest.mock("@/components/account/address-form", () => ({
  AddressForm: ({
    address,
    title,
  }: {
    address?: { address_name?: string; id: string }
    title?: string
  }) => (
    <div
      aria-label={address ? "Edit address" : "Add address"}
      data-address-name={address?.address_name || ""}
      data-address-id={address?.id || ""}
      role="form"
    >
      {title}
    </div>
  ),
}))

jest.mock("@/components/account/address-form-panel", () => ({
  AddressFormPanel: ({ defaultOpen = false }: { defaultOpen?: boolean }) => (
    <section
      data-default-open={String(defaultOpen)}
      data-testid="add-address-panel"
    >
      <button type="button">Add Address</button>
      {defaultOpen ? (
        <div aria-label="Add address" role="form">
          Add new address
        </div>
      ) : null}
    </section>
  ),
}))

jest.mock("lucide-react", () => ({
  Home: () => <span />,
  Pencil: () => <span />,
  Plus: () => <span />,
  Trash2: () => <span />,
}))

const addresses = [
  {
    id: "addr_1",
    address_name: "Workshop",
    first_name: "Launch",
    last_name: "Gate",
    company: "3D Byte Tech",
    address_1: "32 Kiernan St",
    city: "Gwynneville",
    province: "NSW",
    country_code: "au",
    postal_code: "2500",
    phone: "0400000000",
    is_default_shipping: true,
  },
  {
    id: "addr_2",
    first_name: "Backup",
    last_name: "Address",
    address_1: "12 Homestead Pl",
    city: "Kingston",
    province: "TAS",
    country_code: "au",
    postal_code: "7050",
    is_default: false,
  },
]

describe("account addresses page", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSessionAction.mockResolvedValue({ success: true })
    mockGetAddressesAction.mockResolvedValue({ success: true, addresses })
  })

  it("opens the expandable add form from the mode query", async () => {
    render(await AddressesPage({ searchParams: { mode: "add" } }))

    expect(screen.getByTestId("add-address-panel")).toHaveAttribute(
      "data-default-open",
      "true",
    )
    expect(
      screen.getByRole("form", { name: /add address/i }),
    ).toBeInTheDocument()
    expect(screen.getByText("Add new address")).toBeInTheDocument()
  })

  it("opens edit in place for the selected address", async () => {
    render(await AddressesPage({ searchParams: { edit: "addr_1" } }))

    expect(screen.getByRole("form", { name: /edit address/i })).toHaveAttribute(
      "data-address-id",
      "addr_1",
    )
    expect(screen.getByRole("form", { name: /edit address/i })).toHaveAttribute(
      "data-address-name",
      "Workshop",
    )
    expect(screen.getByText("Edit Workshop")).toBeInTheDocument()
    expect(screen.getByText(/12 Homestead Pl/i)).toBeInTheDocument()
    expect(screen.getByText(/Gwynneville, NSW 2500/i)).toBeInTheDocument()
  })

  it("keeps the address list read-only until add or edit is selected", async () => {
    render(await AddressesPage())

    expect(screen.queryByRole("form")).not.toBeInTheDocument()
    expect(screen.getByTestId("add-address-panel")).toHaveAttribute(
      "data-default-open",
      "false",
    )
    expect(screen.getByText("Workshop")).toBeInTheDocument()
    expect(screen.getByText(/Launch Gate/i)).toBeInTheDocument()
    expect(screen.getByText(/3D Byte Tech/i)).toBeInTheDocument()
    expect(screen.getByText("Default Shipping")).toBeInTheDocument()
    expect(screen.getByText(/32 Kiernan St/i)).toBeInTheDocument()
    expect(screen.getByText(/12 Homestead Pl/i)).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: /edit/i })[0]).toHaveAttribute(
      "href",
      "/account/addresses?edit=addr_1#address-form",
    )
  })
})
