import {
  ExecArgs,
  IFulfillmentModuleService,
  IProductModuleService,
  ISalesChannelModuleService,
} from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
  createSalesChannelsWorkflow,
  createShippingProfilesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import {
  AI_READY_CATALOGUE_PRODUCTS,
  buildAiCatalogueProductInput,
} from "./ai-ready-catalogue/catalogue";

type SeedLogger = {
  info(message: string): void;
  warn(message: string): void;
};

type MetadataRecord = Record<string, unknown>;

type ExistingSeedProduct = {
  id: string;
  metadata?: MetadataRecord | null;
};

type SeedAiReadyCatalogueResult = {
  created: number;
  updated: number;
  total: number;
};

type AiCatalogueProductSeedInput = ReturnType<
  typeof buildAiCatalogueProductInput
> & {
  sales_channels: { id: string }[];
  shipping_profile_id: string;
};

type AiCatalogueProductUpdateInput = Omit<
  AiCatalogueProductSeedInput,
  "options" | "variants"
> & {
  id: string;
};

const DEFAULT_CURRENCY_CODE = "aud";
const DEFAULT_SALES_CHANNEL_NAME = "Default Sales Channel";

function isRecord(value: unknown): value is MetadataRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSeedCurrencyCode(): string {
  return (
    process.env.AI_CATALOGUE_CURRENCY_CODE?.trim().toLowerCase() ||
    DEFAULT_CURRENCY_CODE
  );
}

function getSalesChannelName(): string {
  return (
    process.env.AI_CATALOGUE_SALES_CHANNEL_NAME?.trim() ||
    DEFAULT_SALES_CHANNEL_NAME
  );
}

async function ensureDefaultShippingProfileId(
  container: ExecArgs["container"],
): Promise<string> {
  const fulfillmentModuleService: IFulfillmentModuleService =
    container.resolve(Modules.FULFILLMENT);

  const existingProfiles =
    await fulfillmentModuleService.listShippingProfiles({
      type: "default",
    });

  if (existingProfiles[0]?.id) {
    return existingProfiles[0].id;
  }

  const { result } = await createShippingProfilesWorkflow(container).run({
    input: {
      data: [
        {
          name: "Default Shipping Profile",
          type: "default",
        },
      ],
    },
  });

  const profileId = result[0]?.id;

  if (!profileId) {
    throw new Error("Unable to create a default shipping profile.");
  }

  return profileId;
}

async function ensureSalesChannelId(
  container: ExecArgs["container"],
  name: string,
): Promise<string> {
  const salesChannelModuleService: ISalesChannelModuleService =
    container.resolve(Modules.SALES_CHANNEL);

  const existingChannels = await salesChannelModuleService.listSalesChannels({
    name,
  });

  if (existingChannels[0]?.id) {
    return existingChannels[0].id;
  }

  const { result } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [{ name }],
    },
  });

  const channelId = result[0]?.id;

  if (!channelId) {
    throw new Error(`Unable to create sales channel "${name}".`);
  }

  return channelId;
}

async function findExistingProductByHandle(
  productModuleService: IProductModuleService,
  handle: string,
): Promise<ExistingSeedProduct | null> {
  const products = await productModuleService.listProducts(
    { handle },
    {
      select: ["id", "metadata"],
      take: 1,
    },
  );

  return products[0] ?? null;
}

export default async function seedAiReadyCatalogue({
  container,
}: ExecArgs): Promise<SeedAiReadyCatalogueResult> {
  const logger = container.resolve(
    ContainerRegistrationKeys.LOGGER,
  ) as SeedLogger;
  const productModuleService: IProductModuleService = container.resolve(
    Modules.PRODUCT,
  );
  const currencyCode = getSeedCurrencyCode();
  const shippingProfileId = await ensureDefaultShippingProfileId(container);
  const salesChannelId = await ensureSalesChannelId(
    container,
    getSalesChannelName(),
  );
  const productsToCreate: AiCatalogueProductSeedInput[] = [];
  const productsToUpdate: AiCatalogueProductUpdateInput[] = [];

  for (const product of AI_READY_CATALOGUE_PRODUCTS) {
    const productInput = {
      ...buildAiCatalogueProductInput(product, currencyCode),
      sales_channels: [{ id: salesChannelId }],
      shipping_profile_id: shippingProfileId,
    };
    const existingProduct = await findExistingProductByHandle(
      productModuleService,
      product.handle,
    );

    if (!existingProduct) {
      productsToCreate.push(productInput);
      continue;
    }

    const existingMetadata = isRecord(existingProduct.metadata)
      ? existingProduct.metadata
      : {};

    productsToUpdate.push({
      id: existingProduct.id,
      title: productInput.title,
      handle: productInput.handle,
      description: productInput.description,
      status: productInput.status,
      is_giftcard: productInput.is_giftcard,
      discountable: productInput.discountable,
      images: productInput.images,
      metadata: {
        ...existingMetadata,
        ...productInput.metadata,
      },
      sales_channels: productInput.sales_channels,
      shipping_profile_id: productInput.shipping_profile_id,
    });
  }

  if (productsToCreate.length > 0) {
    await createProductsWorkflow(container).run({
      input: { products: productsToCreate },
    });
  }

  if (productsToUpdate.length > 0) {
    await updateProductsWorkflow(container).run({
      input: { products: productsToUpdate },
    });
  }

  const result = {
    created: productsToCreate.length,
    updated: productsToUpdate.length,
    total: AI_READY_CATALOGUE_PRODUCTS.length,
  };

  logger.info(
    `AI-ready catalogue seed completed: created=${result.created}, updated=${result.updated}, total=${result.total}`,
  );

  if (productsToUpdate.length > 0) {
    logger.warn(
      "Existing AI catalogue products were updated at product level; variant/price migrations should be handled deliberately when seed pricing changes.",
    );
  }

  return result;
}
