import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

type SeedLogger = {
  info(message: string): void;
  warn(message: string): void;
};

type MetadataRecord = Record<string, unknown>;

type ProductRecord = {
  id: string;
  handle?: string | null;
  metadata?: MetadataRecord | null;
};

type ProductModuleService = {
  deleteProducts(ids: string[]): Promise<unknown>;
  listProducts(
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ): Promise<ProductRecord[]>;
  updateProducts(id: string, data: Record<string, unknown>): Promise<unknown>;
};

type LegacyCleanupMode = "archive" | "delete";

export type RetireLegacyAiCatalogueProductsResult = {
  archived: number;
  deleted: number;
  found: number;
  mode: LegacyCleanupMode;
};

const LEGACY_CATALOGUE_SOURCE = "3dbyte-ai-ready-catalogue";
const REPLACEMENT_CATALOGUE = "source-backed-real-world-products";

function isRecord(value: unknown): value is MetadataRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getCleanupMode(): LegacyCleanupMode {
  const mode = process.env.AI_CATALOGUE_LEGACY_CLEANUP_MODE?.trim();

  if (!mode || mode === "archive") {
    return "archive";
  }

  if (mode === "delete") {
    return "delete";
  }

  throw new Error(
    `Unsupported AI_CATALOGUE_LEGACY_CLEANUP_MODE "${mode}". Use "archive" or "delete".`,
  );
}

function getRetiredAt(): string {
  return (
    process.env.AI_CATALOGUE_LEGACY_RETIRED_AT?.trim() ||
    new Date().toISOString()
  );
}

export function isLegacyAiCatalogueProduct(product: ProductRecord): boolean {
  const metadata = isRecord(product.metadata) ? product.metadata : {};

  return (
    typeof product.handle === "string" &&
    product.handle.startsWith("ai-") &&
    metadata.ai_catalogue_seed === true &&
    metadata.source === LEGACY_CATALOGUE_SOURCE &&
    metadata.source_backed_catalogue_seed !== true
  );
}

async function archiveLegacyProducts(
  productModuleService: ProductModuleService,
  products: ProductRecord[],
): Promise<number> {
  const retiredAt = getRetiredAt();

  for (const product of products) {
    const metadata = isRecord(product.metadata) ? product.metadata : {};

    await productModuleService.updateProducts(product.id, {
      status: "draft",
      metadata: {
        ...metadata,
        ai_catalogue_cleanup_mode: "archive",
        ai_catalogue_retired: true,
        ai_catalogue_retired_at: retiredAt,
        replaced_by_catalogue: REPLACEMENT_CATALOGUE,
      },
    });
  }

  return products.length;
}

export default async function retireLegacyAiCatalogueProducts({
  container,
}: ExecArgs): Promise<RetireLegacyAiCatalogueProductsResult> {
  const logger = container.resolve(
    ContainerRegistrationKeys.LOGGER,
  ) as SeedLogger;
  const productModuleService = container.resolve(
    Modules.PRODUCT,
  ) as ProductModuleService;
  const mode = getCleanupMode();
  const products = await productModuleService.listProducts(
    {},
    {
      select: ["id", "handle", "metadata"],
      take: 5000,
    },
  );
  const legacyProducts = products.filter(isLegacyAiCatalogueProduct);

  logger.info(
    `Found ${legacyProducts.length} legacy synthetic AI catalogue products.`,
  );

  if (legacyProducts.length === 0) {
    return { archived: 0, deleted: 0, found: 0, mode };
  }

  if (mode === "delete") {
    await productModuleService.deleteProducts(
      legacyProducts.map((product) => product.id),
    );
    logger.warn(
      `Deleted ${legacyProducts.length} legacy synthetic AI catalogue products.`,
    );

    return {
      archived: 0,
      deleted: legacyProducts.length,
      found: legacyProducts.length,
      mode,
    };
  }

  const archived = await archiveLegacyProducts(
    productModuleService,
    legacyProducts,
  );
  logger.info(
    `Archived ${archived} legacy synthetic AI catalogue products as draft.`,
  );

  return {
    archived,
    deleted: 0,
    found: legacyProducts.length,
    mode,
  };
}
