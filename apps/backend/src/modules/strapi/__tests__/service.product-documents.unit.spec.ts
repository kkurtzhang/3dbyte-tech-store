import StrapiModuleService from "../service";

describe("StrapiModuleService product documents", () => {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  function createService() {
    return new StrapiModuleService(
      { logger },
      {
        apiUrl: "http://localhost:1337",
        apiToken: "test-token",
      } as any,
    );
  }

  it("returns an empty list without error logging when product documents fail soft", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () =>
        JSON.stringify({
          data: null,
          error: {
            status: 404,
            name: "NotFoundError",
            message: "Not Found",
          },
        }),
    });

    const service = createService();

    await expect(
      service.listProductDocuments("prod_1", { failSoft: true }),
    ).resolves.toEqual([]);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
