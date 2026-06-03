const mockCreateProductsRun = jest.fn();
const mockCreateSalesChannelsRun = jest.fn();
const mockCreateShippingProfilesRun = jest.fn();
const mockCreateProductCategoriesRun = jest.fn();
const mockUpdateProductsRun = jest.fn();
const mockBatchInventoryItemLevelsRun = jest.fn();
const mockCreateBrandRun = jest.fn();
const mockLinkProductsToBrandRun = jest.fn();

jest.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    LOGGER: "logger",
    QUERY: "query",
  },
  Modules: {
    FULFILLMENT: "fulfillment",
    PRODUCT: "product",
    SALES_CHANNEL: "sales_channel",
  },
  ProductStatus: {
    PUBLISHED: "published",
  },
}));

jest.mock("@medusajs/medusa/core-flows", () => ({
  createProductsWorkflow: jest.fn(() => ({
    run: mockCreateProductsRun,
  })),
  createProductCategoriesWorkflow: jest.fn(() => ({
    run: mockCreateProductCategoriesRun,
  })),
  createSalesChannelsWorkflow: jest.fn(() => ({
    run: mockCreateSalesChannelsRun,
  })),
  createShippingProfilesWorkflow: jest.fn(() => ({
    run: mockCreateShippingProfilesRun,
  })),
  updateProductsWorkflow: jest.fn(() => ({
    run: mockUpdateProductsRun,
  })),
  batchInventoryItemLevelsWorkflow: jest.fn(() => ({
    run: mockBatchInventoryItemLevelsRun,
  })),
}));

jest.mock("../../workflows/brand/create-brand", () => ({
  createBrandWorkflow: jest.fn(() => ({
    run: mockCreateBrandRun,
  })),
}));

jest.mock("../../workflows/brand/link-products-to-brand", () => ({
  LinkProductsToBrandWorkflow: jest.fn(() => ({
    run: mockLinkProductsToBrandRun,
  })),
}));

import seedAiReadyCatalogue from "../seed-ai-ready-catalogue";

describe("seedAiReadyCatalogue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateProductsRun.mockResolvedValue({ result: [] });
    mockCreateProductCategoriesRun.mockResolvedValue({ result: [] });
    mockCreateSalesChannelsRun.mockResolvedValue({ result: [] });
    mockCreateShippingProfilesRun.mockResolvedValue({ result: [] });
    mockUpdateProductsRun.mockResolvedValue({ result: [] });
    mockBatchInventoryItemLevelsRun.mockResolvedValue({ result: [] });
    mockCreateBrandRun.mockResolvedValue({
      result: { id: "brand_created", handle: "created-brand" },
    });
    mockLinkProductsToBrandRun.mockResolvedValue({ result: {} });
  });

  it("updates existing source-backed products and attaches taxonomy relations without tag values", async () => {
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    };
    const productModuleService = {
      listProducts: jest.fn(async ({ handle }: { handle: string }) => [
        {
          id: `prod_${handle}`,
          handle,
          metadata: {
            existing_metadata: true,
          },
        },
      ]),
      listProductCollections: jest.fn(async () => [
        { id: "pc_premium", handle: "premium-filaments" },
        { id: "pc_storage", handle: "filament-drying-storage" },
        { id: "pc_nozzles", handle: "nozzles-tips" },
        { id: "pc_hotends", handle: "hotend-upgrades" },
        { id: "pc_build", handle: "build-plates-surfaces" },
        { id: "pc_rc", handle: "rc-model-building" },
      ]),
      updateProducts: jest.fn(async () => ({})),
    };
    const fulfillmentModuleService = {
      listShippingProfiles: jest.fn(async () => [{ id: "sp_default" }]),
    };
    const salesChannelModuleService = {
      listSalesChannels: jest.fn(async () => [{ id: "sc_web_store" }]),
    };
    const brandModuleService = {
      listBrands: jest.fn(async () => [
        { id: "brand_polymaker", handle: "polymaker" },
        { id: "brand_bambu", handle: "bambu-lab" },
        { id: "brand_phaetus", handle: "phaetus" },
      ]),
    };
    const query = {
      graph: jest.fn(
        async ({
          entity,
          fields,
          filters,
        }: {
          entity: string;
          fields?: string[];
          filters?: Record<string, unknown>;
        }) => {
          if (entity === "product_category") {
            return {
              data: [
                {
                  id: "cat_filament",
                  handle: "filament",
                  parent_category_id: null,
                },
                {
                  id: "cat_petg",
                  handle: "petg",
                  parent_category_id: "cat_filament",
                },
                {
                  id: "cat_petg_legacy",
                  handle: "filament/petg",
                  parent_category_id: "cat_filament",
                },
                { id: "cat_tools", handle: "tools" },
                { id: "cat_nozzles", handle: "spare-parts/nozzles" },
                { id: "cat_hotends", handle: "spare-parts/hotends" },
                { id: "cat_build", handle: "build-plates" },
                { id: "cat_electronics", handle: "electronics" },
                { id: "cat_motion", handle: "motion" },
              ],
            };
          }

          if (entity === "product") {
            const handles = Array.isArray(filters?.handle)
              ? filters.handle.filter(
                  (handle): handle is string => typeof handle === "string",
                )
              : typeof filters?.handle === "string"
                ? [filters.handle]
                : [];

            if (fields?.some((field) => field.includes("inventory_items"))) {
              return {
                data: [
                  {
                    id: "prod_polymaker-polylite-petg-black-175-1kg",
                    brand: null,
                    handle: "polymaker-polylite-petg-black-175-1kg",
                    variants: [
                      {
                        id: "variant_petg_black",
                        sku: "PM-PETG-BLK-175-1KG",
                        inventory_items: [
                          { inventory_item_id: "iitem_petg_black" },
                        ],
                      },
                    ],
                  },
                ],
              };
            }

            return {
              data: handles.map((handle) => ({
                id: `prod_${handle}`,
                handle,
                metadata: {
                  existing_metadata: true,
                },
                variants:
                  handle === "polymaker-polylite-petg-black-175-1kg"
                    ? [
                        {
                          id: "variant_petg_black",
                          sku: "PM-PETG-BLK-175-1KG",
                        },
                      ]
                    : [],
              })),
            };
          }

          if (entity === "stock_location") {
            return { data: [{ id: "sloc_au" }] };
          }

          return { data: [] };
        },
      ),
    };
    const container = {
      resolve: jest.fn((key: string) => {
        const services: Record<string, unknown> = {
          brand: brandModuleService,
          fulfillment: fulfillmentModuleService,
          logger,
          product: productModuleService,
          query,
          sales_channel: salesChannelModuleService,
        };

        return services[key];
      }),
    };

    await seedAiReadyCatalogue({ container } as never);

    expect(mockCreateProductsRun).not.toHaveBeenCalled();
    expect(mockUpdateProductsRun).toHaveBeenCalledTimes(1);
    expect(productModuleService.updateProducts).toHaveBeenCalled();
    expect(mockLinkProductsToBrandRun).toHaveBeenCalled();

    const updateInput = mockUpdateProductsRun.mock.calls[0]?.[0] as {
      input?: {
        products?: Array<{
          handle: string;
          images?: Array<{ url: string }>;
          thumbnail?: string;
          variants?: Array<{ id?: string; sku?: string }>;
        }>;
      };
    };
    const products = updateInput.input?.products ?? [];
    const petgProduct = products.find(
      (product) => product.handle === "polymaker-polylite-petg-black-175-1kg",
    );

    expect(petgProduct).toBeDefined();
    expect(
      petgProduct?.variants?.find(
        (variant) => variant.sku === "PM-PETG-BLK-175-1KG",
      ),
    ).toMatchObject({ id: "variant_petg_black" });
    expect(petgProduct?.thumbnail).toBe(petgProduct?.images?.[0]?.url);
    expect(petgProduct?.thumbnail).toContain("shop.polymaker.com");
    expect(petgProduct?.thumbnail).not.toContain("placehold.co");
    expect(productModuleService.updateProducts).toHaveBeenCalledWith(
      expect.stringContaining("polymaker-polylite-petg-black-175-1kg"),
      expect.objectContaining({
        categories: [{ id: "cat_petg" }],
        collection_id: "pc_premium",
      }),
    );
    expect(productModuleService.updateProducts).toHaveBeenCalledWith(
      expect.stringContaining("polymaker-polylite-petg-black-175-1kg"),
      expect.not.objectContaining({
        tags: expect.anything(),
      }),
    );
    expect(mockBatchInventoryItemLevelsRun).toHaveBeenCalledWith({
      input: {
        create: [
          {
            inventory_item_id: "iitem_petg_black",
            location_id: "sloc_au",
            stocked_quantity: expect.any(Number),
          },
        ],
        update: [
          {
            inventory_item_id: "iitem_petg_black",
            location_id: "sloc_au",
            stocked_quantity: expect.any(Number),
          },
        ],
      },
    });
  });
});
