import { gzipSync } from "node:zlib";
import { ingestAddresses } from "../ingest";
import type { AddressPipelineConfig, OpenAddressFeature } from "../types";

const mockAddDocuments = jest.fn();
const mockUpdateSettings = jest.fn();
const mockGetStats = jest.fn();
const mockCreateIndex = jest.fn();
const mockSwapIndexes = jest.fn();
const mockDeleteIndex = jest.fn();
const mockWaitForTask = jest.fn();

jest.mock("meilisearch", () => ({
  MeiliSearch: jest.fn().mockImplementation(() => ({
    createIndex: mockCreateIndex,
    index: (indexName: string) => ({
      addDocuments: (
        documents: Record<string, unknown>[],
        options: { primaryKey: string },
      ) => mockAddDocuments(indexName, documents, options),
      updateSettings: (settings: Record<string, unknown>) =>
        mockUpdateSettings(indexName, settings),
      getStats: () => mockGetStats(indexName),
    }),
    swapIndexes: mockSwapIndexes,
    deleteIndex: mockDeleteIndex,
    tasks: {
      waitForTask: mockWaitForTask,
    },
  })),
}));

function createFeature(
  overrides: Partial<OpenAddressFeature["properties"]> = {},
): OpenAddressFeature {
  return {
    type: "Feature",
    properties: {
      hash: "hash-1",
      number: "10",
      street: "George Street",
      unit: "",
      city: "Sydney",
      district: "",
      region: "NSW",
      postcode: "2000",
      id: "",
      ...overrides,
    },
    geometry: {
      type: "Point",
      coordinates: [151.2093, -33.8688],
    },
  };
}

function createResponse(features: OpenAddressFeature[]): Response {
  const payload = features.map((feature) => JSON.stringify(feature)).join("\n");
  return new Response(gzipSync(payload), { status: 200 });
}

function createConfig(): AddressPipelineConfig {
  return {
    batchSize: 2,
    tempIndexPrefix: "addresses_tmp_",
    localityTempIndexPrefix: "localities_tmp_",
    meilisearchHost: "http://localhost:7700",
    meilisearchApiKey: "test-key",
    addressIndexName: "addresses",
    localityIndexName: "localities",
  };
}

describe("ingestAddresses locality indexing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
    jest.spyOn(global, "fetch").mockResolvedValue(createResponse([]));

    mockCreateIndex.mockResolvedValue({ taskUid: 1 });
    mockUpdateSettings.mockResolvedValue({ taskUid: 2 });
    mockAddDocuments.mockResolvedValue({ taskUid: 3 });
    mockSwapIndexes.mockResolvedValue({ taskUid: 4 });
    mockDeleteIndex.mockResolvedValue({ taskUid: 5 });
    mockWaitForTask.mockResolvedValue({ uid: 99, status: "succeeded" });
    mockGetStats.mockResolvedValue({ numberOfDocuments: 14_000_000 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("dedupes locality documents from the same GeoJSON stream and swaps a separate locality index", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      createResponse([
        createFeature({ hash: "hash-1", city: "Sydney" }),
        createFeature({ hash: "hash-2", city: " sydney " }),
        createFeature({
          hash: "hash-3",
          city: "Parramatta",
          postcode: "2150",
        }),
      ]),
    );

    const result = await ingestAddresses(
      "https://example.com/source.geojson.gz",
      createConfig(),
      {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      } as never,
    );

    expect(mockCreateIndex).toHaveBeenCalledWith(
      "addresses_tmp_1800000000000",
      { primaryKey: "id" },
    );
    expect(mockCreateIndex).toHaveBeenCalledWith(
      "localities_tmp_1800000000000",
      { primaryKey: "id" },
    );

    const localityBatches = mockAddDocuments.mock.calls.filter(
      ([indexName]) => indexName === "localities_tmp_1800000000000",
    );
    expect(localityBatches).toHaveLength(1);
    expect(localityBatches[0][1]).toEqual([
      {
        id: "au_nsw_2000_sydney",
        display_name: "Sydney, NSW 2000",
        locality: "Sydney",
        state: "NSW",
        postcode: "2000",
        country: "AU",
      },
      {
        id: "au_nsw_2150_parramatta",
        display_name: "Parramatta, NSW 2150",
        locality: "Parramatta",
        state: "NSW",
        postcode: "2150",
        country: "AU",
      },
    ]);

    expect(mockSwapIndexes).toHaveBeenCalledWith([
      {
        indexes: ["addresses", "addresses_tmp_1800000000000"],
        rename: false,
      },
      {
        indexes: ["localities", "localities_tmp_1800000000000"],
        rename: false,
      },
    ]);
    expect(result.localityRows).toBe(2);
    expect(result.localityIndexName).toBe("localities");
  });
});
