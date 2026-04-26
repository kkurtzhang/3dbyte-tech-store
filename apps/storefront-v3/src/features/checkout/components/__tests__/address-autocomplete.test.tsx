import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

import { searchAddresses } from "@/lib/search/addresses"
import { AddressAutocomplete } from "../address-autocomplete"

jest.mock("@/lib/search/addresses", () => ({
  searchAddresses: jest.fn(),
}))

const address = {
  id: "addr_1",
  full_address: "12 Main Street, Sydney, NSW, 2000",
  unit: "",
  number: "12",
  street: "Main Street",
  suburb: "Sydney",
  state: "NSW",
  postcode: "2000",
  country: "AU",
}

describe("AddressAutocomplete", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it("renders an address combobox", () => {
    render(<AddressAutocomplete onSelect={jest.fn()} />)

    expect(screen.getByRole("combobox", { name: /address/i })).toBeInTheDocument()
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("does not search before 3 characters", () => {
    render(<AddressAutocomplete onSelect={jest.fn()} />)

    fireEvent.change(screen.getByRole("combobox", { name: /address/i }), {
      target: { value: "12" },
    })
    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(searchAddresses).not.toHaveBeenCalled()
  })

  it("shows results after a debounced search", async () => {
    ;(searchAddresses as jest.Mock).mockResolvedValue({
      addresses: [address],
      count: 1,
      processingTimeMs: 4,
    })
    render(<AddressAutocomplete onSelect={jest.fn()} />)

    fireEvent.change(screen.getByRole("combobox", { name: /address/i }), {
      target: { value: "12 Main" },
    })
    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(await screen.findByRole("option", { name: address.full_address })).toBeInTheDocument()
  })

  it("calls onSelect when an address is clicked", async () => {
    const onSelect = jest.fn()
    ;(searchAddresses as jest.Mock).mockResolvedValue({
      addresses: [address],
      count: 1,
      processingTimeMs: 4,
    })
    render(<AddressAutocomplete onSelect={onSelect} />)

    fireEvent.change(screen.getByRole("combobox", { name: /address/i }), {
      target: { value: "12 Main" },
    })
    act(() => {
      jest.advanceTimersByTime(300)
    })

    fireEvent.click(await screen.findByRole("option", { name: address.full_address }))

    expect(onSelect).toHaveBeenCalledWith(address)
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("selects the highlighted result with Enter", async () => {
    const onSelect = jest.fn()
    ;(searchAddresses as jest.Mock).mockResolvedValue({
      addresses: [address],
      count: 1,
      processingTimeMs: 4,
    })
    render(<AddressAutocomplete onSelect={onSelect} />)
    const input = screen.getByRole("combobox", { name: /address/i })

    fireEvent.change(input, { target: { value: "12 Main" } })
    act(() => {
      jest.advanceTimersByTime(300)
    })
    await screen.findByRole("option", { name: address.full_address })
    fireEvent.keyDown(input, { key: "ArrowDown" })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(onSelect).toHaveBeenCalledWith(address)
  })

  it("shows an empty state for no results", async () => {
    ;(searchAddresses as jest.Mock).mockResolvedValue({
      addresses: [],
      count: 0,
      processingTimeMs: 1,
    })
    render(<AddressAutocomplete onSelect={jest.fn()} />)

    fireEvent.change(screen.getByRole("combobox", { name: /address/i }), {
      target: { value: "zzzz" },
    })
    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(screen.getByText("No addresses found")).toBeInTheDocument()
    })
  })

  it("closes the dropdown on Escape", async () => {
    ;(searchAddresses as jest.Mock).mockResolvedValue({
      addresses: [address],
      count: 1,
      processingTimeMs: 4,
    })
    render(<AddressAutocomplete onSelect={jest.fn()} />)
    const input = screen.getByRole("combobox", { name: /address/i })

    fireEvent.change(input, { target: { value: "12 Main" } })
    act(() => {
      jest.advanceTimersByTime(300)
    })
    await screen.findByRole("listbox")
    fireEvent.keyDown(input, { key: "Escape" })

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })
})
