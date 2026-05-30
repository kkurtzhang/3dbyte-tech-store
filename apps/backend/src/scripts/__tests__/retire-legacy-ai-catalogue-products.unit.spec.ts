jest.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    LOGGER: "logger",
  },
  Modules: {
    PRODUCT: "product",
  },
}));

import retireLegacyAiCatalogueProducts from "../retire-legacy-ai-catalogue-products";

describe("retireLegacyAiCatalogueProducts", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("archives only synthetic ai catalogue seed products by default", async () => {
    process.env.AI_CATALOGUE_LEGACY_RETIRED_AT = "2026-05-31T00:00:00.000Z";
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    };
    const productModuleService = {
      deleteProducts: jest.fn(),
      listProducts: jest.fn(async () => [
        {
          id: "prod_legacy",
          handle: "ai-petg-black-175-1kg",
          metadata: {
            ai_catalogue_seed: true,
            ai_catalogue_seed_version: 1,
            source: "3dbyte-ai-ready-catalogue",
            keep: "preserved",
          },
        },
        {
          id: "prod_real",
          handle: "polymaker-polylite-petg-black-175-1kg",
          metadata: {
            source_backed_catalogue_seed: true,
          },
        },
        {
          id: "prod_not_ours",
          handle: "ai-customer-custom-part",
          metadata: {
            source: "manual",
          },
        },
      ]),
      updateProducts: jest.fn(async () => ({})),
    };
    const container = {
      resolve: jest.fn((key: string) => {
        const services: Record<string, unknown> = {
          logger,
          product: productModuleService,
        };

        return services[key];
      }),
    };

    const result = await retireLegacyAiCatalogueProducts({
      container,
    } as never);

    expect(result).toEqual({
      archived: 1,
      deleted: 0,
      found: 1,
      mode: "archive",
    });
    expect(productModuleService.deleteProducts).not.toHaveBeenCalled();
    expect(productModuleService.updateProducts).toHaveBeenCalledTimes(1);
    expect(productModuleService.updateProducts).toHaveBeenCalledWith(
      "prod_legacy",
      {
        status: "draft",
        metadata: {
          ai_catalogue_cleanup_mode: "archive",
          ai_catalogue_retired: true,
          ai_catalogue_retired_at: "2026-05-31T00:00:00.000Z",
          ai_catalogue_seed: true,
          ai_catalogue_seed_version: 1,
          keep: "preserved",
          replaced_by_catalogue: "source-backed-real-world-products",
          source: "3dbyte-ai-ready-catalogue",
        },
      },
    );
  });

  it("deletes synthetic ai catalogue seed products only when delete mode is explicit", async () => {
    process.env.AI_CATALOGUE_LEGACY_CLEANUP_MODE = "delete";
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    };
    const productModuleService = {
      deleteProducts: jest.fn(async () => ({})),
      listProducts: jest.fn(async () => [
        {
          id: "prod_legacy",
          handle: "ai-nozzle-brass-v6-04",
          metadata: {
            ai_catalogue_seed: true,
            source: "3dbyte-ai-ready-catalogue",
          },
        },
        {
          id: "prod_source_backed",
          handle: "bambu-lab-complete-hotend-p1-series-04",
          metadata: {
            source_backed_catalogue_seed: true,
          },
        },
      ]),
      updateProducts: jest.fn(),
    };
    const container = {
      resolve: jest.fn((key: string) => {
        const services: Record<string, unknown> = {
          logger,
          product: productModuleService,
        };

        return services[key];
      }),
    };

    const result = await retireLegacyAiCatalogueProducts({
      container,
    } as never);

    expect(result).toEqual({
      archived: 0,
      deleted: 1,
      found: 1,
      mode: "delete",
    });
    expect(productModuleService.updateProducts).not.toHaveBeenCalled();
    expect(productModuleService.deleteProducts).toHaveBeenCalledWith([
      "prod_legacy",
    ]);
  });
});
