import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"

import { getAddressesAction, getSessionAction } from "@/app/actions/auth"
import { searchAddresses } from "@/lib/search/addresses"
import { AddressStep } from "../address-step"

jest.mock("@/app/actions/auth", () => ({
  getAddressesAction: jest.fn(),
  getSessionAction: jest.fn(),
}))

jest.mock("@/lib/search/addresses", () => ({
  searchAddresses: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

const mockGetAddressesAction = getAddressesAction as jest.MockedFunction<typeof getAddressesAction>
const mockGetSessionAction = getSessionAction as jest.MockedFunction<typeof getSessionAction>
const mockSearchAddresses = searchAddresses as jest.MockedFunction<typeof searchAddresses>

jest.mock("lucide-react", () => ({
  Check: () => <span data-testid="check-icon" />,
  Home: () => <span data-testid="home-icon" />,
  MapPin: () => <span data-testid="map-pin-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
  User: () => <span data-testid="user-icon" />,
  UserPlus: () => <span data-testid="user-plus-icon" />,
  X: () => <span data-testid="x-icon" />,
}))

const address = {
  id: "addr_1",
  full_address: "Unit 3, 12 Main Street, Sydney, NSW, 2000",
  unit: "Unit 3",
  number: "12",
  street: "Main Street",
  suburb: "Sydney",
  state: "NSW",
  postcode: "2000",
  country: "AU",
}

async function flushDebounce() {
  await act(async () => {
    jest.advanceTimersByTime(300)
    await Promise.resolve()
  })
}

describe("AddressStep address autocomplete", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    mockGetSessionAction.mockResolvedValue({
      success: false,
      error: "No session",
    })
    mockGetAddressesAction.mockResolvedValue({
      success: true,
      addresses: [],
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("auto-fills address fields when a suggestion is selected", async () => {
    mockSearchAddresses.mockResolvedValue({
      addresses: [address],
      count: 1,
      processingTimeMs: 4,
    })
    render(<AddressStep onComplete={jest.fn()} />)
    await screen.findByRole("button", { name: /continue as guest/i })
    fireEvent.click(screen.getByRole("button", { name: /continue as guest/i }))

    const input = screen.getByRole("combobox", { name: /address/i })

    fireEvent.change(input, { target: { value: "12 Main" } })
    await flushDebounce()
    const option = await screen.findByRole("option", {
      name: address.full_address,
    })
    await act(async () => {
      fireEvent.click(option)
      await Promise.resolve()
    })

    expect(screen.getByLabelText("Address")).toHaveValue("12 Main Street")
    expect(screen.getByLabelText(/apartment/i)).toHaveValue("Unit 3")
    expect(screen.getByLabelText("City")).toHaveValue("Sydney")
    expect(screen.getByLabelText("State")).toHaveValue("NSW")
    expect(screen.getByLabelText("Postal Code")).toHaveValue("2000")
    expect(screen.getByLabelText("Country")).toHaveValue("AU")
  })

  it("still allows manual address submission without autocomplete", async () => {
    const onComplete = jest.fn()
    render(<AddressStep onComplete={onComplete} />)
    await screen.findByRole("button", { name: /continue as guest/i })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /continue as guest/i }))
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(screen.getByLabelText("Email Address")).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Email Address"), {
        target: { value: "engineer@example.com" },
      })
      fireEvent.change(screen.getByLabelText("First Name"), {
        target: { value: "Ada" },
      })
      fireEvent.change(screen.getByLabelText("Last Name"), {
        target: { value: "Lovelace" },
      })
      fireEvent.change(screen.getByLabelText("Address"), {
        target: { value: "99 Manual Road" },
      })
      fireEvent.change(screen.getByLabelText("City"), {
        target: { value: "Hobart" },
      })
      fireEvent.change(screen.getByLabelText("State"), {
        target: { value: "TAS" },
      })
      fireEvent.change(screen.getByLabelText("Postal Code"), {
        target: { value: "7000" },
      })
      fireEvent.change(screen.getByLabelText("Country"), {
        target: { value: "au" },
      })
      fireEvent.click(screen.getByRole("button", { name: /continue to delivery/i }))
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          address_1: "99 Manual Road",
          city: "Hobart",
          province: "TAS",
          postal_code: "7000",
          country_code: "au",
        })
      )
    })
  })

  it("lets customers enter a billing address that differs from shipping", async () => {
    const onComplete = jest.fn()
    render(<AddressStep onComplete={onComplete} />)

    fireEvent.click(await screen.findByRole("button", { name: /continue as guest/i }))

    await waitFor(() => {
      expect(screen.getByLabelText("Email Address")).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Email Address"), {
        target: { value: "engineer@example.com" },
      })
      fireEvent.change(screen.getByLabelText("First Name"), {
        target: { value: "Ada" },
      })
      fireEvent.change(screen.getByLabelText("Last Name"), {
        target: { value: "Lovelace" },
      })
      fireEvent.change(screen.getByLabelText("Address"), {
        target: { value: "99 Shipping Road" },
      })
      fireEvent.change(screen.getByLabelText("City"), {
        target: { value: "Hobart" },
      })
      fireEvent.change(screen.getByLabelText("State"), {
        target: { value: "TAS" },
      })
      fireEvent.change(screen.getByLabelText("Postal Code"), {
        target: { value: "7000" },
      })
      fireEvent.click(screen.getByRole("checkbox", { name: /billing address is same as shipping/i }))
      await Promise.resolve()
    })

    const billingSection = screen.getByRole("group", { name: "Billing Address" })

    await act(async () => {
      fireEvent.change(within(billingSection).getByLabelText("First Name"), {
        target: { value: "Grace" },
      })
      fireEvent.change(within(billingSection).getByLabelText("Last Name"), {
        target: { value: "Hopper" },
      })
      fireEvent.change(within(billingSection).getByRole("combobox", { name: "Address" }), {
        target: { value: "12 Billing Street" },
      })
      fireEvent.change(within(billingSection).getByLabelText("City"), {
        target: { value: "Melbourne" },
      })
      fireEvent.change(within(billingSection).getByLabelText("State"), {
        target: { value: "VIC" },
      })
      fireEvent.change(within(billingSection).getByLabelText("Postal Code"), {
        target: { value: "3000" },
      })
      fireEvent.change(within(billingSection).getByLabelText("Country"), {
        target: { value: "AU" },
      })
      fireEvent.click(screen.getByRole("button", { name: /continue to delivery/i }))
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          address_1: "99 Shipping Road",
          billing_address: expect.objectContaining({
            first_name: "Grace",
            last_name: "Hopper",
            address_1: "12 Billing Street",
            city: "Melbourne",
            province: "VIC",
            postal_code: "3000",
            country_code: "AU",
          }),
        })
      )
    })
  })

  it("auto-fills billing address fields without repeating Billing in every label", async () => {
    const onComplete = jest.fn()
    mockSearchAddresses.mockResolvedValue({
      addresses: [address],
      count: 1,
      processingTimeMs: 4,
    })
    render(<AddressStep onComplete={onComplete} />)

    fireEvent.click(await screen.findByRole("button", { name: /continue as guest/i }))

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Email Address"), {
        target: { value: "engineer@example.com" },
      })
      fireEvent.change(screen.getByLabelText("First Name"), {
        target: { value: "Ada" },
      })
      fireEvent.change(screen.getByLabelText("Last Name"), {
        target: { value: "Lovelace" },
      })
      fireEvent.change(screen.getByLabelText("Address"), {
        target: { value: "99 Shipping Road" },
      })
      fireEvent.change(screen.getByLabelText("City"), {
        target: { value: "Hobart" },
      })
      fireEvent.change(screen.getByLabelText("State"), {
        target: { value: "TAS" },
      })
      fireEvent.change(screen.getByLabelText("Postal Code"), {
        target: { value: "7000" },
      })
      fireEvent.click(screen.getByRole("checkbox", { name: /billing address is same as shipping/i }))
      await Promise.resolve()
    })

    expect(screen.getByRole("group", { name: "Billing Address" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Billing First Name")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Billing Address")).not.toBeInTheDocument()

    const billingSection = screen.getByRole("group", { name: "Billing Address" })
    const billingAddressInput = within(billingSection).getByRole("combobox", {
      name: "Address",
    })

    fireEvent.change(billingAddressInput, { target: { value: "12 Main" } })
    await flushDebounce()
    const option = await within(billingSection).findByRole("option", {
      name: address.full_address,
    })
    await act(async () => {
      fireEvent.click(option)
      await Promise.resolve()
    })

    expect(within(billingSection).getByLabelText("Address")).toHaveValue("12 Main Street")
    expect(within(billingSection).getByLabelText(/apartment/i)).toHaveValue("Unit 3")
    expect(within(billingSection).getByLabelText("City")).toHaveValue("Sydney")
    expect(within(billingSection).getByLabelText("State")).toHaveValue("NSW")
    expect(within(billingSection).getByLabelText("Postal Code")).toHaveValue("2000")
    expect(within(billingSection).getByLabelText("Country")).toHaveValue("AU")
  })

  it("offers guest, sign-in, and account creation choices before the guest form", async () => {
    render(<AddressStep onComplete={jest.fn()} />)

    expect(await screen.findByRole("button", { name: /continue as guest/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument()
    expect(screen.queryByLabelText("Email Address")).not.toBeInTheDocument()
    expect(mockGetAddressesAction).not.toHaveBeenCalled()
  })

  it("opens checkout sign-in and account creation in an auth sheet", async () => {
    render(<AddressStep onComplete={jest.fn()} />)

    fireEvent.click(await screen.findByRole("button", { name: /sign in/i }))
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /close/i }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /create account/i }))
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /create account/i })).toBeInTheDocument()
  })

  it("lets guests reselect the checkout method after choosing guest checkout", async () => {
    render(<AddressStep onComplete={jest.fn()} />)

    fireEvent.click(await screen.findByRole("button", { name: /continue as guest/i }))

    expect(await screen.findByText(/checking out as guest/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Email Address")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /change method/i }))

    expect(await screen.findByRole("button", { name: /continue as guest/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument()
    expect(screen.queryByLabelText("Email Address")).not.toBeInTheDocument()
  })
})
