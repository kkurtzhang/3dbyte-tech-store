import { discoverLatestDownloadUrl } from "../discover";
import { ingestAddresses } from "../ingest";
import { isAddressReindexEnabled, runAddressReindex } from "../reindex";

jest.mock("../discover", () => ({
  discoverLatestDownloadUrl: jest.fn(),
}));

jest.mock("../ingest", () => ({
  ingestAddresses: jest.fn(),
}));

const discoverLatestDownloadUrlMock =
  discoverLatestDownloadUrl as jest.MockedFunction<typeof discoverLatestDownloadUrl>;
const ingestAddressesMock = ingestAddresses as jest.MockedFunction<
  typeof ingestAddresses
>;

const originalEnv = process.env;

function createContainer() {
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
  };

  return {
    logger,
    container: {
      resolve: jest.fn().mockReturnValue(logger),
    },
  };
}

describe("address reindex runner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.ADDRESS_REINDEX_ENABLED;
    delete process.env.ADDRESS_MANUAL_REINDEX_ENABLED;
    delete process.env.ADDRESS_SYNC_BATCH_SIZE;
    delete process.env.MEILISEARCH_HOST;
    delete process.env.MEILISEARCH_BACKEND_API_KEY;
    delete process.env.MEILISEARCH_ADDRESS_INDEX_NAME;
    delete process.env.MEILISEARCH_LOCALITY_INDEX_NAME;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("enables scheduled reindexing only with ADDRESS_REINDEX_ENABLED", () => {
    expect(isAddressReindexEnabled("scheduled")).toBe(false);

    process.env.ADDRESS_MANUAL_REINDEX_ENABLED = "true";
    expect(isAddressReindexEnabled("scheduled")).toBe(false);

    process.env.ADDRESS_REINDEX_ENABLED = "true";
    expect(isAddressReindexEnabled("scheduled")).toBe(true);
  });

  it("enables manual reindexing with either manual or scheduled ownership", () => {
    expect(isAddressReindexEnabled("manual")).toBe(false);

    process.env.ADDRESS_MANUAL_REINDEX_ENABLED = "true";
    expect(isAddressReindexEnabled("manual")).toBe(true);

    delete process.env.ADDRESS_MANUAL_REINDEX_ENABLED;
    process.env.ADDRESS_REINDEX_ENABLED = "true";
    expect(isAddressReindexEnabled("manual")).toBe(true);
  });

  it("runs the stream-only address pipeline with environment-derived config", async () => {
    process.env.ADDRESS_MANUAL_REINDEX_ENABLED = "true";
    process.env.ADDRESS_SYNC_BATCH_SIZE = "25000";
    process.env.MEILISEARCH_HOST = "https://search.example.com";
    process.env.MEILISEARCH_BACKEND_API_KEY = "server-key";
    process.env.MEILISEARCH_ADDRESS_INDEX_NAME = "addresses_v1";
    process.env.MEILISEARCH_LOCALITY_INDEX_NAME = "localities_v1";

    discoverLatestDownloadUrlMock.mockResolvedValue({
      downloadUrl: "https://v2.openaddresses.io/batch/source.geojson.gz",
      jobId: 123,
      expectedCount: 17_000_000,
    });
    ingestAddressesMock.mockResolvedValue({
      totalRows: 17_000_000,
      localityRows: 1_200_000,
      batchesProcessed: 680,
      durationMs: 120_000,
      indexName: "addresses_v1",
      localityIndexName: "localities_v1",
    });
    const { container } = createContainer();

    const result = await runAddressReindex(container as never, {
      trigger: "manual",
    });

    expect(discoverLatestDownloadUrlMock).toHaveBeenCalledTimes(1);
    expect(ingestAddressesMock).toHaveBeenCalledWith(
      "https://v2.openaddresses.io/batch/source.geojson.gz",
      expect.objectContaining({
        batchSize: 25_000,
        meilisearchHost: "https://search.example.com",
        meilisearchApiKey: "server-key",
        addressIndexName: "addresses_v1",
        localityIndexName: "localities_v1",
        tempIndexPrefix: "addresses_tmp_",
        localityTempIndexPrefix: "localities_tmp_",
      }),
      expect.any(Object),
    );
    expect(result).toEqual(
      expect.objectContaining({
        trigger: "manual",
        discovery: expect.objectContaining({ jobId: 123 }),
        result: expect.objectContaining({ totalRows: 17_000_000 }),
      }),
    );
  });
});
