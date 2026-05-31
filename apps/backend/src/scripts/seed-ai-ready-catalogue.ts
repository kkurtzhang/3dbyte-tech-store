import {
  ExecArgs,
  IFulfillmentModuleService,
  IProductModuleService,
  ISalesChannelModuleService,
} from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createSalesChannelsWorkflow,
  createShippingProfilesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import {
  AI_READY_CATALOGUE_PRODUCTS,
  AiReadyCatalogueProduct,
  buildAiCatalogueProductInput,
} from "./ai-ready-catalogue/catalogue";
import { createBrandWorkflow } from "../workflows/brand/create-brand";
import { LinkProductsToBrandWorkflow } from "../workflows/brand/link-products-to-brand";

type SeedLogger = {
  info(message: string): void;
  warn(message: string): void;
};

type MetadataRecord = Record<string, unknown>;

type ExistingSeedProduct = {
  id: string;
  handle?: string;
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
const BRAND_MODULE = "brand";

type QueryService = {
  graph(input: {
    entity: string;
    fields: string[];
    filters?: Record<string, unknown>;
    pagination?: { take?: number };
  }): Promise<{ data?: Array<Record<string, unknown>> }>;
};

type CategoryRecord = {
  id: string;
  handle: string;
};

type CollectionRecord = {
  id: string;
  handle: string;
};

type BrandRecord = {
  id: string;
  handle: string;
};

type BrandModuleService = {
  listBrands(
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ): Promise<BrandRecord[]>;
};

type ProductModuleWithTaxonomy = IProductModuleService & {
  listProductCollections?: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<CollectionRecord[]>;
  createProductCollections?: (
    data:
      | Array<{ title: string; handle: string }>
      | { title: string; handle: string },
  ) => Promise<CollectionRecord[] | CollectionRecord>;
  updateProducts: (
    id: string,
    data: Record<string, unknown>,
  ) => Promise<unknown>;
};

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

function createHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleizeHandle(handle: string): string {
  const segments = handle.split("/");
  const lastSegment = segments[segments.length - 1] ?? handle;

  return lastSegment
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

async function ensureDefaultShippingProfileId(
  container: ExecArgs["container"],
): Promise<string> {
  const fulfillmentModuleService: IFulfillmentModuleService = container.resolve(
    Modules.FULFILLMENT,
  );

  const existingProfiles = await fulfillmentModuleService.listShippingProfiles({
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
      select: ["id", "handle", "metadata"],
      take: 1,
    },
  );

  return products[0] ?? null;
}

async function fetchCategoryMap(
  query: QueryService,
): Promise<Map<string, string>> {
  const { data = [] } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
    pagination: { take: 1000 },
  });

  return new Map(
    data
      .filter(
        (category): category is CategoryRecord =>
          typeof category.id === "string" &&
          typeof category.handle === "string",
      )
      .map((category) => [category.handle, category.id]),
  );
}

async function ensureCategoryMap(
  container: ExecArgs["container"],
  query: QueryService,
  products: AiReadyCatalogueProduct[],
): Promise<Map<string, string>> {
  const categoryMap = await fetchCategoryMap(query);
  const categoryHandles = [
    ...new Set(
      products.flatMap((product) => {
        const segments = product.categoryHandle.split("/");
        return segments.map((_, index) =>
          segments.slice(0, index + 1).join("/"),
        );
      }),
    ),
  ].sort((left, right) => left.split("/").length - right.split("/").length);

  for (const handle of categoryHandles) {
    if (categoryMap.has(handle)) {
      continue;
    }

    const parentHandle = handle.includes("/")
      ? handle.split("/").slice(0, -1).join("/")
      : undefined;
    const parentId = parentHandle ? categoryMap.get(parentHandle) : undefined;
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: [
          {
            name: titleizeHandle(handle),
            handle,
            is_active: true,
            ...(parentId ? { parent_category_id: parentId } : {}),
          },
        ],
      },
    });
    const createdCategory = result[0];

    if (createdCategory?.id) {
      categoryMap.set(handle, createdCategory.id);
    }
  }

  return categoryMap;
}

async function ensureCollectionMap(
  productModuleService: ProductModuleWithTaxonomy,
  products: AiReadyCatalogueProduct[],
  logger: SeedLogger,
): Promise<Map<string, string>> {
  const existingCollections = productModuleService.listProductCollections
    ? await productModuleService.listProductCollections({}, { take: 1000 })
    : [];
  const collectionMap = new Map(
    existingCollections.map((collection) => [collection.handle, collection.id]),
  );
  const missingHandles = [
    ...new Set(products.map((product) => product.collectionHandle)),
  ].filter((handle) => !collectionMap.has(handle));

  if (!productModuleService.createProductCollections) {
    for (const handle of missingHandles) {
      logger.warn(
        `Collection "${handle}" is missing and cannot be created by the product module service.`,
      );
    }

    return collectionMap;
  }

  for (const handle of missingHandles) {
    const created = await productModuleService.createProductCollections({
      title: titleizeHandle(handle),
      handle,
    });
    const collection = Array.isArray(created) ? created[0] : created;

    if (collection?.id) {
      collectionMap.set(handle, collection.id);
    }
  }

  return collectionMap;
}

async function ensureBrandMap(
  container: ExecArgs["container"],
  brandModuleService: BrandModuleService,
  products: AiReadyCatalogueProduct[],
): Promise<Map<string, string>> {
  const existingBrands = await brandModuleService.listBrands(
    {},
    { take: 1000 },
  );
  const brandMap = new Map(
    existingBrands.map((brand) => [brand.handle, brand.id]),
  );

  for (const product of products) {
    if (brandMap.has(product.brandHandle)) {
      continue;
    }

    const { result } = await createBrandWorkflow(container).run({
      input: {
        name: product.brandName,
        handle: product.brandHandle,
      },
    });

    if (result?.id) {
      brandMap.set(product.brandHandle, result.id);
    }
  }

  return brandMap;
}

async function isProductLinkedToBrand(
  query: QueryService,
  productId: string,
  brandId: string,
): Promise<boolean> {
  const { data = [] } = await query.graph({
    entity: "product",
    fields: ["id", "brand.id"],
    filters: { id: productId },
    pagination: { take: 1 },
  });
  const brand = data[0]?.brand;

  if (Array.isArray(brand)) {
    return brand.some(
      (item) =>
        isRecord(item) && typeof item.id === "string" && item.id === brandId,
    );
  }

  return isRecord(brand) && brand.id === brandId;
}

async function applyProductRelations(
  container: ExecArgs["container"],
  query: QueryService,
  productModuleService: ProductModuleWithTaxonomy,
  product: AiReadyCatalogueProduct,
  existingProduct: ExistingSeedProduct,
  categoryMap: Map<string, string>,
  collectionMap: Map<string, string>,
  brandMap: Map<string, string>,
  logger: SeedLogger,
): Promise<void> {
  const categoryId =
    categoryMap.get(product.categoryHandle) ??
    categoryMap.get(product.categoryHandle.split("/")[0] ?? "");
  const collectionId = collectionMap.get(product.collectionHandle);
  const brandId = brandMap.get(product.brandHandle);

  await productModuleService.updateProducts(existingProduct.id, {
    ...(categoryId ? { categories: [{ id: categoryId }] } : {}),
    ...(collectionId ? { collection_id: collectionId } : {}),
  });

  if (!categoryId) {
    logger.warn(
      `Category "${product.categoryHandle}" was not found for product "${product.handle}".`,
    );
  }

  if (!collectionId) {
    logger.warn(
      `Collection "${product.collectionHandle}" was not found for product "${product.handle}".`,
    );
  }

  if (!brandId) {
    logger.warn(
      `Brand "${product.brandHandle}" was not found for product "${product.handle}".`,
    );
    return;
  }

  if (await isProductLinkedToBrand(query, existingProduct.id, brandId)) {
    return;
  }

  await LinkProductsToBrandWorkflow(container).run({
    input: {
      brand_id: brandId,
      products: [existingProduct.id],
    },
  });
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
  const productModuleWithTaxonomy =
    productModuleService as ProductModuleWithTaxonomy;
  const brandModuleService = container.resolve(
    BRAND_MODULE,
  ) as BrandModuleService;
  const query = container.resolve(
    ContainerRegistrationKeys.QUERY,
  ) as QueryService;
  const currencyCode = getSeedCurrencyCode();
  const shippingProfileId = await ensureDefaultShippingProfileId(container);
  const salesChannelId = await ensureSalesChannelId(
    container,
    getSalesChannelName(),
  );
  const categoryMap = await ensureCategoryMap(
    container,
    query,
    AI_READY_CATALOGUE_PRODUCTS,
  );
  const collectionMap = await ensureCollectionMap(
    productModuleWithTaxonomy,
    AI_READY_CATALOGUE_PRODUCTS,
    logger,
  );
  const brandMap = await ensureBrandMap(
    container,
    brandModuleService,
    AI_READY_CATALOGUE_PRODUCTS,
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
      thumbnail: productInput.thumbnail,
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

  for (const product of AI_READY_CATALOGUE_PRODUCTS) {
    const existingProduct = await findExistingProductByHandle(
      productModuleService,
      product.handle,
    );

    if (!existingProduct) {
      logger.warn(
        `Product "${product.handle}" was not found after upsert; taxonomy relations were skipped.`,
      );
      continue;
    }

    await applyProductRelations(
      container,
      query,
      productModuleWithTaxonomy,
      product,
      existingProduct,
      categoryMap,
      collectionMap,
      brandMap,
      logger,
    );
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
