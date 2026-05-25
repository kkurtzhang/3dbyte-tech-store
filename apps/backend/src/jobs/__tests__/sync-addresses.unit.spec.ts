import syncAddressesJob from "../sync-addresses";
import { discoverLatestDownloadUrl } from "../../lib/address-pipeline/discover";
import { ingestAddresses } from "../../lib/address-pipeline/ingest";

jest.mock("../../lib/address-pipeline/discover", () => ({
  discoverLatestDownloadUrl: jest.fn(),
}));

jest.mock("../../lib/address-pipeline/ingest", () => ({
  ingestAddresses: jest.fn(),
}));

const discoverLatestDownloadUrlMock =
  discoverLatestDownloadUrl as jest.MockedFunction<typeof discoverLatestDownloadUrl>;
const ingestAddressesMock = ingestAddresses as jest.MockedFunction<typeof ingestAddresses>;

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

describe("syncAddressesJob", () => {
  const previousEnv = process.env.ADDRESS_REINDEX_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ADDRESS_REINDEX_ENABLED;
  });

  afterAll(() => {
    process.env.ADDRESS_REINDEX_ENABLED = previousEnv;
  });

  it("skips address reindexing unless explicitly enabled", async () => {
    const { container, logger } = createContainer();

    await syncAddressesJob(container as never);

    expect(discoverLatestDownloadUrlMock).not.toHaveBeenCalled();
    expect(ingestAddressesMock).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      "Address reindex disabled for this environment; skipping"
    );
  });

  it("runs the address pipeline when explicitly enabled", async () => {
    process.env.ADDRESS_REINDEX_ENABLED = "true";
    discoverLatestDownloadUrlMock.mockResolvedValue({
      downloadUrl: "https://v2.openaddresses.io/batch/source.geojson.gz",
      jobId: 123,
      expectedCount: 17_000_000,
    });
    ingestAddressesMock.mockResolvedValue({
      totalRows: 17_000_000,
      localityRows: 1_200_000,
      batchesProcessed: 340,
      durationMs: 120_000,
      indexName: "addresses_v1",
    });
    const { container } = createContainer();

    await syncAddressesJob(container as never);

    expect(discoverLatestDownloadUrlMock).toHaveBeenCalledTimes(1);
    expect(ingestAddressesMock).toHaveBeenCalledWith(
      "https://v2.openaddresses.io/batch/source.geojson.gz",
      expect.objectContaining({
        addressIndexName: "addresses",
        localityIndexName: "localities",
      }),
      expect.any(Object)
    );
  });
});
