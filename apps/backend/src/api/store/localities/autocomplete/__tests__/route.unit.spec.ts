import { GET } from "../route";
import { MEILISEARCH_MODULE } from "../../../../../modules/meilisearch";
import { StoreLocalityAutocompleteParams } from "../validators";

const locality = {
  id: "au_nsw_2500_wollongong",
  display_name: "Wollongong, NSW 2500",
  locality: "Wollongong",
  state: "NSW",
  postcode: "2500",
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
  service: { search: jest.Mock },
) {
  return {
    validatedQuery,
    scope: {
      resolve: jest.fn().mockReturnValue(service),
    },
  };
}

describe("StoreLocalityAutocompleteParams", () => {
  it("coerces limit and applies defaults", () => {
    expect(
      StoreLocalityAutocompleteParams.parse({ q: "Wol", limit: "5" }),
    ).toEqual({
      q: "Wol",
      limit: 5,
    });
  });

  it("rejects queries shorter than 2 characters", () => {
    expect(() => StoreLocalityAutocompleteParams.parse({ q: "W" })).toThrow();
  });

  it("rejects unsupported state filters", () => {
    expect(() =>
      StoreLocalityAutocompleteParams.parse({ q: "Wol", state: "CA" }),
    ).toThrow();
  });
});

describe("GET /store/localities/autocomplete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns locality hits from the locality index", async () => {
    const search = jest.fn().mockResolvedValue({
      hits: [locality],
      estimatedTotalHits: 1,
      processingTimeMs: 4,
    });
    const req = createRequest({ q: "Wol", limit: 5 }, { search });
    const res = createResponse();

    await GET(req as never, res as never);

    expect(req.scope.resolve).toHaveBeenCalledWith(MEILISEARCH_MODULE);
    expect(search).toHaveBeenCalledWith("Wol", "locality", {
      limit: 5,
      filter: undefined,
    });
    expect(res.json).toHaveBeenCalledWith({
      localities: [locality],
      count: 1,
      processingTimeMs: 4,
    });
  });

  it("passes country and state filters when provided", async () => {
    const search = jest.fn().mockResolvedValue({
      hits: [locality],
      estimatedTotalHits: 1,
      processingTimeMs: 3,
    });
    const req = createRequest(
      { q: "Wol", limit: 8, country: "AU", state: "NSW" },
      { search },
    );
    const res = createResponse();

    await GET(req as never, res as never);

    expect(search).toHaveBeenCalledWith("Wol", "locality", {
      limit: 8,
      filter: ['country = "AU"', 'state = "NSW"'],
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
      localities: [],
      count: 0,
      processingTimeMs: 2,
    });
  });

  it("returns 500 when locality search fails", async () => {
    const search = jest.fn().mockRejectedValue(new Error("Meilisearch down"));
    const req = createRequest({ q: "Wol", limit: 8 }, { search });
    const res = createResponse();

    await GET(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Failed to search localities",
      error: "Locality search is temporarily unavailable",
    });
  });
});
