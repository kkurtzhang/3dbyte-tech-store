import { searchAddresses } from "../addresses"

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

describe("searchAddresses", () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it("returns empty results without fetching for queries shorter than 3 characters", async () => {
    const result = await searchAddresses("12")

    expect(result).toEqual({ addresses: [], count: 0, processingTimeMs: 0 })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("returns parsed address results for a valid query", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        addresses: [address],
        count: 1,
        processingTimeMs: 4,
      }),
    })

    const result = await searchAddresses("12 Main", 5)

    expect(result.addresses).toEqual([address])
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:9000/store/addresses/autocomplete?q=12+Main&limit=5"
    )
  })

  it("passes the country filter when provided", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        addresses: [address],
        count: 1,
        processingTimeMs: 3,
      }),
    })

    await searchAddresses("12 Main", 8, "AU")

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:9000/store/addresses/autocomplete?q=12+Main&limit=8&country=AU"
    )
  })

  it("returns empty results when the API fails", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => undefined)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    })

    const result = await searchAddresses("12 Main")

    expect(result).toEqual({ addresses: [], count: 0, processingTimeMs: 0 })
  })
})
