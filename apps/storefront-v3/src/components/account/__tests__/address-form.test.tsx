import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"

import { AddressForm } from "../address-form"
import { AddressFormPanel } from "../address-form-panel"

const mockFetch = jest.fn()
const mockRefresh = jest.fn()
const mockPush = jest.fn()

global.fetch = mockFetch as unknown as typeof fetch

const autocompleteAddress = {
  id: "addr_auto_1",
  full_address: "12 Homestead Place, Kingston, TAS, 7050",
  unit: "",
  number: "12",
  street: "Homestead Place",
  suburb: "Kingston",
  state: "TAS",
  postcode: "7050",
  country: "AU",
}

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
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

jest.mock("lucide-react", () => ({
  ChevronDown: () => <span />,
  Plus: () => <span />,
}))

jest.mock("@/features/checkout/components/address-autocomplete", () => ({
  AddressAutocomplete: ({
    defaultValue,
    id,
    onSelect,
    onValueChange,
  }: {
    defaultValue?: string
    id?: string
    // eslint-disable-next-line no-unused-vars
    onSelect: (address: typeof autocompleteAddress) => void
    // eslint-disable-next-line no-unused-vars
    onValueChange?: (value: string) => void
  }) => (
    <div>
      <input
        aria-label="Address"
        id={id}
        onChange={(event) => onValueChange?.(event.target.value)}
        role="combobox"
        value={defaultValue}
      />
      <button type="button" onClick={() => onSelect(autocompleteAddress)}>
        Use Homestead suggestion
      </button>
    </div>
  ),
}))

jest.mock("@/components/ui/button", () => ({
  Button: ({
    asChild,
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) =>
    asChild && React.isValidElement(children) ? (
      children
    ) : (
      <button {...props}>{children}</button>
    ),
}))

jest.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}))

jest.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    ...props
  }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}))

describe("AddressForm", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ success: false }),
    })
  })

  it("renders as an inline account form", () => {
    render(<AddressForm />)

    expect(
      screen.getByRole("form", { name: /add address/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: /add address/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /cancel/i })).toHaveAttribute(
      "href",
      "/account/addresses",
    )
    expect(screen.getByRole("combobox", { name: /address/i })).toHaveValue("")
    expect(screen.getByLabelText("Address Name (Optional)")).toBeInTheDocument()
    expect(screen.getByLabelText("Company (Optional)")).toBeInTheDocument()
    expect(screen.getByLabelText("State")).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("keeps the add-address panel collapsed until the customer expands it", () => {
    render(<AddressFormPanel />)

    expect(screen.queryByRole("form", { name: /add address/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /add address/i }))

    expect(screen.getByRole("form", { name: /add address/i })).toBeInTheDocument()
  })

  it("can render the add-address panel expanded from a route state", () => {
    render(<AddressFormPanel defaultOpen />)

    expect(screen.getByRole("form", { name: /add address/i })).toBeInTheDocument()
  })

  it("closes and clears the add-address panel after a successful save", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<AddressFormPanel defaultOpen />)

    fireEvent.change(screen.getByLabelText("Address Name (Optional)"), {
      target: { value: "Workshop" },
    })
    fireEvent.change(screen.getByLabelText("First Name"), {
      target: { value: "Launch" },
    })
    fireEvent.change(screen.getByLabelText("Last Name"), {
      target: { value: "Gate" },
    })
    fireEvent.change(screen.getByRole("combobox", { name: /address/i }), {
      target: { value: "32 Kiernan St" },
    })
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Gwynneville" },
    })
    fireEvent.change(screen.getByLabelText("Postal Code"), {
      target: { value: "2500" },
    })
    fireEvent.change(screen.getByLabelText("State"), {
      target: { value: "NSW" },
    })
    fireEvent.change(screen.getByLabelText("Country Code"), {
      target: { value: "AU" },
    })

    fireEvent.submit(screen.getByRole("button", { name: /save address/i }))

    await waitFor(() => {
      expect(
        screen.queryByRole("form", { name: /add address/i }),
      ).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /add address/i }))

    expect(screen.getByLabelText("Address Name (Optional)")).toHaveValue("")
    expect(screen.getByLabelText("First Name")).toHaveValue("")
    expect(screen.getByRole("combobox", { name: /address/i })).toHaveValue("")
    expect(screen.getByLabelText("Country Code")).toHaveValue("AU")
  })

  it("submits new addresses to the authenticated JSON API route and refreshes the page", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<AddressForm />)

    fireEvent.change(screen.getByLabelText("Address Name (Optional)"), {
      target: { value: "Workshop" },
    })
    fireEvent.change(screen.getByLabelText("First Name"), {
      target: { value: "Launch" },
    })
    fireEvent.change(screen.getByLabelText("Last Name"), {
      target: { value: "Gate" },
    })
    fireEvent.change(screen.getByLabelText("Company (Optional)"), {
      target: { value: "3D Byte Tech" },
    })
    fireEvent.change(screen.getByRole("combobox", { name: /address/i }), {
      target: { value: "32 Kiernan St" },
    })
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Gwynneville" },
    })
    fireEvent.change(screen.getByLabelText("Postal Code"), {
      target: { value: "2500" },
    })
    fireEvent.change(screen.getByLabelText("State"), {
      target: { value: "NSW" },
    })
    fireEvent.change(screen.getByLabelText("Country Code"), {
      target: { value: "AU" },
    })

    fireEvent.submit(screen.getByRole("button", { name: /save address/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/addresses?action=add",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"address_name":"Workshop"'),
        }),
      )
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/addresses?action=add",
        expect.objectContaining({
          body: expect.stringContaining('"company":"3D Byte Tech"'),
        }),
      )
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/addresses?action=add",
        expect.objectContaining({
          body: expect.stringContaining('"province":"NSW"'),
        }),
      )
    })
    expect(mockRefresh).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith("/account/addresses")
  })

  it("fills city, state, postcode, and country from checkout-style address autocomplete", () => {
    render(<AddressForm />)

    fireEvent.click(screen.getByRole("button", { name: /use homestead suggestion/i }))

    expect(screen.getByRole("combobox", { name: /address/i })).toHaveValue(
      "12 Homestead Place",
    )
    expect(screen.getByLabelText("City")).toHaveValue("Kingston")
    expect(screen.getByLabelText("State")).toHaveValue("TAS")
    expect(screen.getByLabelText("Postal Code")).toHaveValue("7050")
    expect(screen.getByLabelText("Country Code")).toHaveValue("AU")
  })

  it("submits edited addresses to the update route", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(
      <AddressForm
        address={{
          id: "addr_123",
          address_name: "Workshop",
          first_name: "Launch",
          last_name: "Gate",
          company: "3D Byte Tech",
          address_1: "32 Kiernan St",
          city: "Gwynneville",
          province: "NSW",
          country_code: "au",
          postal_code: "2500",
        }}
      />,
    )

    expect(screen.getByLabelText("Address Name (Optional)")).toHaveValue(
      "Workshop",
    )
    expect(screen.getByLabelText("Company (Optional)")).toHaveValue(
      "3D Byte Tech",
    )

    fireEvent.submit(screen.getByRole("button", { name: /save address/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/addresses?action=update&id=addr_123",
        expect.objectContaining({
          method: "POST",
        }),
      )
    })
  })

  it("keeps the inline form open and shows API errors", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: "Authentication required" }),
    })

    render(<AddressForm />)

    fireEvent.submit(screen.getByRole("button", { name: /save address/i }))

    expect(
      await screen.findByText("Authentication required"),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("form", { name: /add address/i }),
    ).toBeInTheDocument()
    expect(mockRefresh).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })
})
