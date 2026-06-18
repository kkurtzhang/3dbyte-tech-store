import {
  ExecArgs,
  IFulfillmentModuleService,
  IProductModuleService,
  ISalesChannelModuleService,
  LinkDefinition,
} from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  batchInventoryItemLevelsWorkflow,
  createInventoryItemsWorkflow,
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
  variants?: Array<{
    id?: string;
    sku?: string | null;
  }>;
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
  "handle"
> & {
  id: string;
  handle?: string;
};

const DEFAULT_CURRENCY_CODE = "aud";
const DEFAULT_SALES_CHANNEL_NAME = "Default Sales Channel";
const DEFAULT_SEED_STOCK_QUANTITY = 12;
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
  parent_category_id?: string | null;
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

type LinkService = {
  create(links: LinkDefinition[]): Promise<unknown>;
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

function titleizeHandle(handle: string): string {
  const segments = handle.split("/");
  const lastSegment = segments[segments.length - 1] ?? handle;

  return lastSegment
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function splitCategoryPath(handle: string): string[] {
  return handle
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function getCategoryLeafHandle(path: string): string {
  const segments = splitCategoryPath(path);
  return segments[segments.length - 1] ?? path;
}

function getVariantInventoryQuantity(
  product: AiReadyCatalogueProduct,
  sku?: string | null,
): number {
  const variant = product.variants?.find((item) => item.sku === sku);

  return variant?.inventoryQuantity ?? DEFAULT_SEED_STOCK_QUANTITY;
}

function withExistingVariantIds(
  productInput: AiCatalogueProductSeedInput,
  existingProduct: ExistingSeedProduct,
): AiCatalogueProductSeedInput["variants"] {
  const existingVariantsBySku = new Map(
    existingProduct.variants
      ?.filter((variant) => variant.id && variant.sku)
      .map((variant) => [variant.sku, variant.id]) ?? [],
  );

  return productInput.variants?.map((variant) => {
    const existingVariantId = variant.sku
      ? existingVariantsBySku.get(variant.sku)
      : undefined;

    return existingVariantId
      ? {
          ...variant,
          id: existingVariantId,
        }
      : variant;
  });
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
  query: QueryService,
  handle: string,
): Promise<ExistingSeedProduct | null> {
  const { data: products = [] } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "metadata", "variants.id", "variants.sku"],
    filters: { handle },
    pagination: { take: 1 },
  });

  const product = products.find((item) => typeof item.id === "string");

  if (!product) {
    return null;
  }

  const variants = Array.isArray(product.variants)
    ? product.variants.filter(isRecord).map((variant) => ({
        id: typeof variant.id === "string" ? variant.id : undefined,
        sku: typeof variant.sku === "string" ? variant.sku : undefined,
      }))
    : undefined;

  return {
    id: product.id as string,
    handle: typeof product.handle === "string" ? product.handle : undefined,
    metadata: isRecord(product.metadata) ? product.metadata : undefined,
    variants,
  };
}

async function findExistingProductForSeed(
  query: QueryService,
  product: AiReadyCatalogueProduct,
): Promise<ExistingSeedProduct | null> {
  const handles = [product.handle, ...(product.legacyHandles ?? [])];

  for (const handle of handles) {
    const existingProduct = await findExistingProductByHandle(query, handle);

    if (existingProduct) {
      return existingProduct;
    }
  }

  return null;
}

async function fetchCategoryRecords(
  query: QueryService,
): Promise<CategoryRecord[]> {
  const { data = [] } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle", "parent_category_id"],
    pagination: { take: 1000 },
  });

  return data.filter(
    (category): category is CategoryRecord =>
      typeof category.id === "string" && typeof category.handle === "string",
  );
}

function buildCategoryPathMap(
  categories: CategoryRecord[],
): Map<string, string> {
  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const categoryMap = new Map<string, string>();
  const pathCache = new Map<string, string>();

  const resolvePath = (category: CategoryRecord): string => {
    const cachedPath = pathCache.get(category.id);

    if (cachedPath) {
      return cachedPath;
    }

    const leafHandle = getCategoryLeafHandle(category.handle);
    const parentCategory = category.parent_category_id
      ? categoriesById.get(category.parent_category_id)
      : undefined;
    const path = parentCategory
      ? `${resolvePath(parentCategory)}/${leafHandle}`
      : leafHandle;

    pathCache.set(category.id, path);
    return path;
  };

  for (const category of categories) {
    const path = resolvePath(category);
    const isCanonicalChildHandle = !category.handle.includes("/");
    const existingCategoryId = categoryMap.get(path);

    if (!existingCategoryId || isCanonicalChildHandle) {
      categoryMap.set(path, category.id);
    }

    if (!category.parent_category_id) {
      categoryMap.set(category.handle, category.id);
    }
  }

  return categoryMap;
}

async function ensureCategoryMap(
  container: ExecArgs["container"],
  query: QueryService,
  products: AiReadyCatalogueProduct[],
): Promise<Map<string, string>> {
  const categoryMap = buildCategoryPathMap(await fetchCategoryRecords(query));
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
            handle: getCategoryLeafHandle(handle),
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

async function ensureInventoryLevels(
  container: ExecArgs["container"],
  query: QueryService,
  products: AiReadyCatalogueProduct[],
  logger: SeedLogger,
): Promise<void> {
  const { data: stockLocations = [] } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
    pagination: { take: 1 },
  });
  const stockLocationId = stockLocations.find(
    (location) => typeof location.id === "string",
  )?.id;

  if (typeof stockLocationId !== "string") {
    logger.warn(
      "No stock location was found; AI catalogue inventory levels were skipped.",
    );
    return;
  }

  const productsByHandle = new Map<string, AiReadyCatalogueProduct>();

  for (const product of products) {
    productsByHandle.set(product.handle, product);
    for (const legacyHandle of product.legacyHandles ?? []) {
      productsByHandle.set(legacyHandle, product);
    }
  }

  const { data: indexedProducts = [] } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "handle",
      "title",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.inventory_items.inventory_item_id",
      "variants.inventory_items.inventory.location_levels.*",
    ],
    filters: { handle: [...productsByHandle.keys()] },
    pagination: { take: 1000 },
  });

  type InventoryLevelSeedInput = {
    inventory_item_id: string;
    location_id: string;
    stocked_quantity: number;
  };
  const createLevelMap = new Map<string, InventoryLevelSeedInput>();
  const updateLevelMap = new Map<string, InventoryLevelSeedInput>();
  const buildInventoryLevel = (
    inventoryItemId: string,
    stockedQuantity: number,
  ): InventoryLevelSeedInput => ({
    inventory_item_id: inventoryItemId,
    location_id: stockLocationId,
    stocked_quantity: stockedQuantity,
  });
  const setInventoryLevel = (
    map: Map<string, InventoryLevelSeedInput>,
    inventoryItemId: string,
    stockedQuantity: number,
  ) => {
    map.set(
      inventoryItemId,
      buildInventoryLevel(inventoryItemId, stockedQuantity),
    );
  };
  const missingInventoryLinks: Array<{
    variant_id: string;
    sku: string;
    title: string;
    stocked_quantity: number;
  }> = [];

  const hasStockLocationLevel = (
    inventoryItem: Record<string, unknown>,
  ): boolean => {
    const inventory = isRecord(inventoryItem.inventory)
      ? inventoryItem.inventory
      : undefined;
    const locationLevels = Array.isArray(inventory?.location_levels)
      ? inventory.location_levels
      : [];

    return locationLevels
      .filter(isRecord)
      .some((level) => level.location_id === stockLocationId);
  };

  for (const indexedProduct of indexedProducts) {
    const handle = indexedProduct.handle;
    const seedProduct =
      typeof handle === "string" ? productsByHandle.get(handle) : undefined;

    if (!seedProduct || !Array.isArray(indexedProduct.variants)) {
      continue;
    }

    for (const variant of indexedProduct.variants) {
      if (!isRecord(variant)) {
        continue;
      }

      const variantSku =
        typeof variant.sku === "string" ? variant.sku : undefined;
      const stockedQuantity = getVariantInventoryQuantity(
        seedProduct,
        variantSku,
      );
      const inventoryItems = Array.isArray(variant.inventory_items)
        ? variant.inventory_items.filter(isRecord)
        : [];

      if (inventoryItems.length === 0) {
        if (typeof variant.id !== "string" || !variantSku) {
          logger.warn(
            `Inventory item was not created for product "${handle}" because a variant ID or SKU was missing.`,
          );
          continue;
        }

        const productTitle =
          typeof indexedProduct.title === "string"
            ? indexedProduct.title
            : seedProduct.title;
        const variantTitle =
          typeof variant.title === "string" && variant.title.trim()
            ? variant.title.trim()
            : variantSku;

        missingInventoryLinks.push({
          variant_id: variant.id,
          sku: variantSku,
          title: `${productTitle} - ${variantTitle}`,
          stocked_quantity: stockedQuantity,
        });
        continue;
      }

      for (const inventoryItem of inventoryItems) {
        const inventoryItemId = inventoryItem.inventory_item_id;

        if (typeof inventoryItemId !== "string") {
          continue;
        }

        const targetMap = hasStockLocationLevel(inventoryItem)
          ? updateLevelMap
          : createLevelMap;

        setInventoryLevel(targetMap, inventoryItemId, stockedQuantity);
      }
    }
  }

  if (missingInventoryLinks.length > 0) {
    const { result: inventoryItems } = await createInventoryItemsWorkflow(
      container,
    ).run({
      input: {
        items: missingInventoryLinks.map((link) => ({
          sku: link.sku,
          title: link.title,
          location_levels: [
            {
              location_id: stockLocationId,
              stocked_quantity: link.stocked_quantity,
            },
          ],
        })),
      },
    });
    const link = container.resolve(
      ContainerRegistrationKeys.LINK,
    ) as LinkService;
    const linkDefinitions = inventoryItems.map((inventoryItem, index) => {
      const missingLink = missingInventoryLinks[index];

      return {
        [Modules.PRODUCT]: {
          variant_id: missingLink.variant_id,
        },
        [Modules.INVENTORY]: {
          inventory_item_id: inventoryItem.id,
        },
      };
    });

    await link.create(linkDefinitions);

    inventoryItems.forEach((inventoryItem, index) => {
      const missingLink = missingInventoryLinks[index];

      setInventoryLevel(
        updateLevelMap,
        inventoryItem.id,
        missingLink.stocked_quantity,
      );
    });
  }

  const inventoryLevelsToCreate = [...createLevelMap.values()];
  const inventoryLevelsToUpdate = [...updateLevelMap.values()];

  if (
    inventoryLevelsToCreate.length === 0 &&
    inventoryLevelsToUpdate.length === 0
  ) {
    logger.warn(
      "No AI catalogue inventory items were found; stock levels were skipped.",
    );
    return;
  }

  await batchInventoryItemLevelsWorkflow(container).run({
    input: {
      create: inventoryLevelsToCreate,
      update: inventoryLevelsToUpdate,
    },
  });
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
    const existingProduct = await findExistingProductForSeed(query, product);

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
      handle:
        typeof productInput.handle === "string" ? productInput.handle : undefined,
      description: productInput.description,
      status: productInput.status,
      thumbnail: productInput.thumbnail,
      is_giftcard: productInput.is_giftcard,
      discountable: productInput.discountable,
      images: productInput.images,
      options: productInput.options,
      variants: withExistingVariantIds(productInput, existingProduct),
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
      query,
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

  await ensureInventoryLevels(
    container,
    query,
    AI_READY_CATALOGUE_PRODUCTS,
    logger,
  );

  const result = {
    created: productsToCreate.length,
    updated: productsToUpdate.length,
    total: AI_READY_CATALOGUE_PRODUCTS.length,
  };

  logger.info(
    `AI-ready catalogue seed completed: created=${result.created}, updated=${result.updated}, total=${result.total}`,
  );

  if (productsToUpdate.length > 0) {
    logger.info(
      "Existing AI catalogue products were updated with seed-managed taxonomy, variants, prices, and stock levels.",
    );
  }

  return result;
}
