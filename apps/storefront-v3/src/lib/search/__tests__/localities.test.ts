import { searchLocalities } from "../localities";

const locality = {
  id: "au_nsw_2500_wollongong",
  display_name: "Wollongong, NSW 2500",
  locality: "Wollongong",
  state: "NSW",
  postcode: "2500",
  country: "AU",
};

function expectFetchToLocalityUrl(url: string) {
  const [requestedUrl, options] = (global.fetch as jest.Mock).mock.calls[0];

  expect(requestedUrl).toBe(url);

  if (options) {
    expect(options).toEqual({
      headers: {
        "x-publishable-api-key": expect.any(String),
      },
    });
  }
}

describe("searchLocalities", () => {
  const originalFetch = global.fetch;
  const originalPublishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    if (originalPublishableKey) {
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = originalPublishableKey;
    } else {
      delete process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
    }
    global.fetch = originalFetch;
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it("returns empty results without fetching for queries shorter than 2 characters", async () => {
    const result = await searchLocalities("W");

    expect(result).toEqual({ localities: [], count: 0, processingTimeMs: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns parsed locality results for a valid query", async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        localities: [locality],
        count: 1,
        processingTimeMs: 4,
      }),
    });

    const result = await searchLocalities("Wol", 5);

    expect(result.localities).toEqual([locality]);
    expectFetchToLocalityUrl(
      "http://localhost:9000/store/localities/autocomplete?q=Wol&limit=5",
    );
  });

  it("passes country and state filters when provided", async () => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        localities: [locality],
        count: 1,
        processingTimeMs: 3,
      }),
    });

    await searchLocalities("Wol", 8, { country: "AU", state: "NSW" });

    expectFetchToLocalityUrl(
      "http://localhost:9000/store/localities/autocomplete?q=Wol&limit=8&country=AU&state=NSW",
    );
  });

  it("sends the Medusa publishable key when configured", async () => {
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = "pk_test";
    jest.resetModules();
    const { searchLocalities: searchLocalitiesWithKey } = await import(
      "../localities"
    );
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        localities: [locality],
        count: 1,
        processingTimeMs: 3,
      }),
    });

    await searchLocalitiesWithKey("Wol", 8);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:9000/store/localities/autocomplete?q=Wol&limit=8",
      {
        headers: {
          "x-publishable-api-key": "pk_test",
        },
      },
    );
  });

  it("returns empty results when the API fails", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await searchLocalities("Wol");

    expect(result).toEqual({ localities: [], count: 0, processingTimeMs: 0 });
  });
});
