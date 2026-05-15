import { GET, POST } from "../route";
import { resetManualAddressReindexStateForTests } from "../../../../../lib/address-pipeline/manual-reindex-state";
import {
  isAddressReindexEnabled,
  runAddressReindex,
} from "../../../../../lib/address-pipeline/reindex";

jest.mock("../../../../../lib/address-pipeline/reindex", () => ({
  isAddressReindexEnabled: jest.fn(),
  runAddressReindex: jest.fn(),
}));

const isAddressReindexEnabledMock =
  isAddressReindexEnabled as jest.MockedFunction<typeof isAddressReindexEnabled>;
const runAddressReindexMock = runAddressReindex as jest.MockedFunction<
  typeof runAddressReindex
>;

function createRequest() {
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
  };

  return {
    logger,
    req: {
      scope: {
        resolve: jest.fn().mockReturnValue(logger),
      },
    },
  };
}

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("admin address meilisearch sync route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetManualAddressReindexStateForTests();
    isAddressReindexEnabledMock.mockReturnValue(true);
  });

  it("reports idle status and whether manual reindex is enabled", async () => {
    const { req } = createRequest();
    const res = createResponse();

    await GET(req as never, res as never);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        status: "idle",
      }),
    );
  });

  it("rejects manual reindex when disabled for the environment", async () => {
    isAddressReindexEnabledMock.mockReturnValue(false);
    const { req } = createRequest();
    const res = createResponse();

    await POST(req as never, res as never);

    expect(runAddressReindexMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        status: "disabled",
        message: "Manual address reindex is disabled for this environment",
      }),
    );
  });

  it("starts a background address reindex run", async () => {
    runAddressReindexMock.mockResolvedValue({
      trigger: "manual",
      discovery: {
        downloadUrl: "https://v2.openaddresses.io/batch/source.geojson.gz",
        jobId: 123,
        expectedCount: 17_000_000,
      },
      result: {
        totalRows: 17_000_000,
        localityRows: 1_200_000,
        batchesProcessed: 680,
        durationMs: 120_000,
        indexName: "addresses_v1",
        localityIndexName: "localities_v1",
      },
    });
    const { req } = createRequest();
    const res = createResponse();

    await POST(req as never, res as never);

    expect(runAddressReindexMock).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        status: "running",
        message: "Address reindex started",
        run_id: expect.any(String),
        started_at: expect.any(String),
      }),
    );
  });

  it("does not start a second run while one is already running", async () => {
    runAddressReindexMock.mockReturnValue(new Promise(() => undefined));
    const { req } = createRequest();
    const firstResponse = createResponse();
    const secondResponse = createResponse();

    await POST(req as never, firstResponse as never);
    await POST(req as never, secondResponse as never);

    expect(runAddressReindexMock).toHaveBeenCalledTimes(1);
    expect(secondResponse.status).toHaveBeenCalledWith(202);
    expect(secondResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        status: "running",
        message: "Address reindex is already running",
      }),
    );
  });
});
