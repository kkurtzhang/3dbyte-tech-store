const mockCreateProductsRun = jest.fn();
const mockCreateSalesChannelsRun = jest.fn();
const mockCreateShippingProfilesRun = jest.fn();
const mockUpdateProductsRun = jest.fn();

jest.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    LOGGER: "logger",
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
  createSalesChannelsWorkflow: jest.fn(() => ({
    run: mockCreateSalesChannelsRun,
  })),
  createShippingProfilesWorkflow: jest.fn(() => ({
    run: mockCreateShippingProfilesRun,
  })),
  updateProductsWorkflow: jest.fn(() => ({
    run: mockUpdateProductsRun,
  })),
}));

import seedAiReadyCatalogue from "../seed-ai-ready-catalogue";

describe("seedAiReadyCatalogue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateProductsRun.mockResolvedValue({ result: [] });
    mockCreateSalesChannelsRun.mockResolvedValue({ result: [] });
    mockCreateShippingProfilesRun.mockResolvedValue({ result: [] });
    mockUpdateProductsRun.mockResolvedValue({ result: [] });
  });

  it("updates existing AI products with storefront-hosted thumbnails", async () => {
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    };
    const productModuleService = {
      listProducts: jest.fn(async ({ handle }: { handle: string }) => [
        {
          id: `prod_${handle}`,
          metadata: {
            existing_metadata: true,
          },
        },
      ]),
    };
    const fulfillmentModuleService = {
      listShippingProfiles: jest.fn(async () => [{ id: "sp_default" }]),
    };
    const salesChannelModuleService = {
      listSalesChannels: jest.fn(async () => [{ id: "sc_web_store" }]),
    };
    const container = {
      resolve: jest.fn((key: string) => {
        const services: Record<string, unknown> = {
          fulfillment: fulfillmentModuleService,
          logger,
          product: productModuleService,
          sales_channel: salesChannelModuleService,
        };

        return services[key];
      }),
    };

    await seedAiReadyCatalogue({ container } as never);

    expect(mockCreateProductsRun).not.toHaveBeenCalled();
    expect(mockUpdateProductsRun).toHaveBeenCalledTimes(1);

    const updateInput = mockUpdateProductsRun.mock.calls[0]?.[0] as {
      input?: {
        products?: Array<{
          handle: string;
          images?: Array<{ url: string }>;
          thumbnail?: string;
        }>;
      };
    };
    const products = updateInput.input?.products ?? [];
    const petgProduct = products.find(
      (product) => product.handle === "ai-petg-black-175-1kg",
    );

    expect(petgProduct).toBeDefined();
    expect(petgProduct?.thumbnail).toBe(petgProduct?.images?.[0]?.url);
    expect(petgProduct?.thumbnail).toContain(
      "/ai-catalogue/products/ai-petg-black-175-1kg.png",
    );
    expect(petgProduct?.thumbnail).not.toContain("placehold.co");
  });
});
