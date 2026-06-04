import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import React from "react"

import { AddressForm } from "../address-form"

const mockFetch = jest.fn()
const mockRefresh = jest.fn()
const mockPush = jest.fn()

global.fetch = mockFetch as unknown as typeof fetch

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
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("submits new addresses to the authenticated JSON API route and refreshes the page", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    render(<AddressForm />)

    fireEvent.change(screen.getByLabelText("First Name"), {
      target: { value: "Launch" },
    })
    fireEvent.change(screen.getByLabelText("Last Name"), {
      target: { value: "Gate" },
    })
    fireEvent.change(screen.getByLabelText("Address Line 1"), {
      target: { value: "32 Kiernan St" },
    })
    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Gwynneville" },
    })
    fireEvent.change(screen.getByLabelText("Postal Code"), {
      target: { value: "2500" },
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
        }),
      )
    })
    expect(mockRefresh).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith("/account/addresses")
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
          first_name: "Launch",
          last_name: "Gate",
          address_1: "32 Kiernan St",
          city: "Gwynneville",
          country_code: "au",
          postal_code: "2500",
        }}
      />,
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
