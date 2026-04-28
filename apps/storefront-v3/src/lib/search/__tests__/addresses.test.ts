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

function expectFetchToAddressUrl(url: string) {
  const [requestedUrl, options] = (global.fetch as jest.Mock).mock.calls[0]

  expect(requestedUrl).toBe(url)

  if (options) {
    expect(options).toEqual({
      headers: {
        "x-publishable-api-key": expect.any(String),
      },
    })
  }
}

describe("searchAddresses", () => {
  const originalFetch = global.fetch
  const originalPublishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    global.fetch = jest.fn()
  })

  afterEach(() => {
    if (originalPublishableKey) {
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = originalPublishableKey
    } else {
      delete process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    }
    global.fetch = originalFetch
    jest.resetModules()
    jest.restoreAllMocks()
  })

  it("returns empty results without fetching for queries shorter than 3 characters", async () => {
    const result = await searchAddresses("12")

    expect(result).toEqual({ addresses: [], count: 0, processingTimeMs: 0 })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("returns parsed address results for a valid query", async () => {
    const fetchMock = global.fetch as jest.Mock
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        addresses: [address],
        count: 1,
        processingTimeMs: 4,
      }),
    })

    const result = await searchAddresses("12 Main", 5)

    expect(result.addresses).toEqual([address])
    expectFetchToAddressUrl(
      "http://localhost:9000/store/addresses/autocomplete?q=12+Main&limit=5"
    )
  })

  it("passes the country filter when provided", async () => {
    const fetchMock = global.fetch as jest.Mock
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        addresses: [address],
        count: 1,
        processingTimeMs: 3,
      }),
    })

    await searchAddresses("12 Main", 8, "AU")

    expectFetchToAddressUrl(
      "http://localhost:9000/store/addresses/autocomplete?q=12+Main&limit=8&country=AU"
    )
  })

  it("sends the Medusa publishable key when configured", async () => {
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_test"
    jest.resetModules()
    const { searchAddresses: searchAddressesWithKey } = await import("../addresses")
    const fetchMock = global.fetch as jest.Mock
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        addresses: [address],
        count: 1,
        processingTimeMs: 3,
      }),
    })

    await searchAddressesWithKey("12 Main", 8)

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:9000/store/addresses/autocomplete?q=12+Main&limit=8",
      {
        headers: {
          "x-publishable-api-key": "pk_test",
        },
      }
    )
  })

  it("returns empty results when the API fails", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => undefined)
    const fetchMock = global.fetch as jest.Mock
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    })

    const result = await searchAddresses("12 Main")

    expect(result).toEqual({ addresses: [], count: 0, processingTimeMs: 0 })
  })
})
