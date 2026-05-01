import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

import { getAddressesAction } from "@/app/actions/auth"
import { searchAddresses } from "@/lib/search/addresses"
import { AddressStep } from "../address-step"

jest.mock("@/app/actions/auth", () => ({
  getAddressesAction: jest.fn(),
}))

jest.mock("@/lib/search/addresses", () => ({
  searchAddresses: jest.fn(),
}))

const mockGetAddressesAction = getAddressesAction as jest.MockedFunction<typeof getAddressesAction>
const mockSearchAddresses = searchAddresses as jest.MockedFunction<typeof searchAddresses>

jest.mock("lucide-react", () => ({
  Home: () => <span data-testid="home-icon" />,
  MapPin: () => <span data-testid="map-pin-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
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
})
