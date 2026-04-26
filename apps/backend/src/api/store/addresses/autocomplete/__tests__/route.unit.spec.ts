import { GET } from "../route";
import { StoreAddressAutocompleteParams } from "../validators";

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
};

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

function createRequest(
  validatedQuery: Record<string, unknown>,
  service: { search: jest.Mock }
) {
  return {
    validatedQuery,
    scope: {
      resolve: jest.fn().mockReturnValue(service),
    },
  };
}

describe("StoreAddressAutocompleteParams", () => {
  it("coerces limit and applies defaults", () => {
    expect(
      StoreAddressAutocompleteParams.parse({ q: "12 Main", limit: "5" })
    ).toEqual({
      q: "12 Main",
      limit: 5,
    });
  });

  it("rejects queries shorter than 3 characters", () => {
    expect(() => StoreAddressAutocompleteParams.parse({ q: "12" })).toThrow();
  });

  it("rejects unsupported country filters", () => {
    expect(() =>
      StoreAddressAutocompleteParams.parse({ q: "12 Main", country: "US" })
    ).toThrow();
  });
});

describe("GET /store/addresses/autocomplete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns address hits for a valid query", async () => {
    const search = jest.fn().mockResolvedValue({
      hits: [address],
      estimatedTotalHits: 1,
      processingTimeMs: 4,
    });
    const req = createRequest({ q: "12 Main", limit: 5 }, { search });
    const res = createResponse();

    await GET(req as never, res as never);

    expect(req.scope.resolve).toHaveBeenCalledWith("meilisearchModuleService");
    expect(search).toHaveBeenCalledWith("12 Main", "address", {
      limit: 5,
      filter: undefined,
    });
    expect(res.json).toHaveBeenCalledWith({
      addresses: [address],
      count: 1,
      processingTimeMs: 4,
    });
  });

  it("passes an address country filter when provided", async () => {
    const search = jest.fn().mockResolvedValue({
      hits: [address],
      estimatedTotalHits: 1,
      processingTimeMs: 3,
    });
    const req = createRequest({ q: "12 Main", limit: 8, country: "AU" }, { search });
    const res = createResponse();

    await GET(req as never, res as never);

    expect(search).toHaveBeenCalledWith("12 Main", "address", {
      limit: 8,
      filter: ['country = "AU"'],
    });
  });

  it("returns an empty response when Meilisearch has no hits", async () => {
    const search = jest.fn().mockResolvedValue({
      hits: [],
      estimatedTotalHits: 0,
      processingTimeMs: 2,
    });
    const req = createRequest({ q: "notreal", limit: 8 }, { search });
    const res = createResponse();

    await GET(req as never, res as never);

    expect(res.json).toHaveBeenCalledWith({
      addresses: [],
      count: 0,
      processingTimeMs: 2,
    });
  });

  it("returns 500 when address search fails", async () => {
    const search = jest.fn().mockRejectedValue(new Error("Meilisearch down"));
    const req = createRequest({ q: "12 Main", limit: 8 }, { search });
    const res = createResponse();

    await GET(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Failed to search addresses",
      error: "Address search is temporarily unavailable",
    });
  });
});
