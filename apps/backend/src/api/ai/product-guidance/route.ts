import type {
  ProductSearchMode,
  ProductSearchStatus,
} from "@3dbyte-tech-store/shared-types";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { MEILISEARCH_MODULE } from "../../../modules/meilisearch";
import type MeilisearchModuleService from "../../../modules/meilisearch/service";
import { flattenAiProductMetadata } from "../../../modules/meilisearch/utils/ai-product-metadata";
import {
  STRAPI_MODULE,
  type StrapiModuleService,
} from "../../../modules/strapi";
import {
  authorizeInternalAiRequest,
  getPositiveInteger,
  getTrimmedString,
  type AiRouteBody,
} from "../_utils";
import { buildExpertProductGuidance } from "./product-experts";

type ProductRecord = Record<string, unknown> & {
  id: string;
  title?: string;
  handle?: string;
};

type ProductHit = Record<string, unknown> & {
  id?: string;
  title?: string;
  handle?: string;
  thumbnail?: string;
  price_aud?: number;
  in_stock?: boolean;
};

const trimTrailingSlash = (value: string): string =>
  value.trim().replace(/\/$/, "");

const isHttpOrigin = (value: string | undefined): value is string => {
  const trimmedValue = value?.trim();

  return Boolean(trimmedValue && /^https?:\/\//.test(trimmedValue));
};

const getFirstStoreCorsOrigin = (): string | undefined =>
  process.env.STORE_CORS?.split(",")
    .map((origin) => origin.trim())
    .find(isHttpOrigin);

const getStorefrontUrl = (): string =>
  trimTrailingSlash(
    [
      process.env.STOREFRONT_URL,
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.SERVICE_FQDN_STOREFRONT,
      process.env.SERVICE_URL_STOREFRONT,
      getFirstStoreCorsOrigin(),
    ].find(isHttpOrigin) ?? "http://localhost:3001",
  );

const buildProductUrl = (handle: string | undefined): string | null =>
  handle
    ? `${getStorefrontUrl()}/products/${encodeURIComponent(handle)}`
    : null;

const productFields = [
  "id",
  "title",
  "handle",
  "status",
  "description",
  "thumbnail",
  "metadata",
  "variants.id",
  "variants.title",
  "variants.sku",
  "variants.inventory_quantity",
  "categories.name",
  "tags.value",
];

function toProductResponse(
  product: ProductRecord,
  hit: ProductHit | undefined,
  strapiDescription: Record<string, unknown> | null,
) {
  // Only the native current product can identify its page; the search index may be stale.
  const handle = product.handle;

  return {
    id: product.id,
    title: product.title ?? hit?.title ?? "Untitled product",
    handle,
    productUrl: buildProductUrl(handle),
    description: product.description ?? null,
    thumbnail: product.thumbnail ?? hit?.thumbnail ?? null,
    priceAud: hit?.price_aud ?? null,
    inStock: hit?.in_stock ?? null,
    variants: product.variants ?? hit?.variants ?? [],
    aiContext: flattenAiProductMetadata(product.metadata),
    strapi: strapiDescription
      ? {
          richDescription: strapiDescription.rich_description ?? null,
          features: strapiDescription.features ?? [],
          specifications: strapiDescription.specifications ?? {},
        }
      : null,
    authoritativeContext: {
      medusa: true,
      meilisearch: Boolean(hit),
      strapi: Boolean(strapiDescription),
      inventory: hasSimulatedInventory(product)
        ? "staging_simulation"
        : "medusa_commerce",
    },
  };
}

function hasSimulatedInventory(product: ProductRecord): boolean {
  return (
    product.metadata !== null &&
    typeof product.metadata === "object" &&
    Object.prototype.hasOwnProperty.call(
      product.metadata,
      "catalogue_simulation",
    )
  );
}

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> => {
  if (!authorizeInternalAiRequest(req, res)) return;

  const body = req.body as AiRouteBody;
  const queryText = getTrimmedString(body.query);
  const limit = getPositiveInteger(body.limit, 4, 6);

  const mode: ProductSearchMode = body.mode === "browse" ? "browse" : "search";
  const respond = (
    status: ProductSearchStatus,
    products: unknown[],
    extra = {},
  ) => res.json({ status, mode, query: queryText, products, ...extra });

  if (
    (body.mode !== undefined &&
      body.mode !== "search" &&
      body.mode !== "browse") ||
    (mode === "search" && (!queryText || queryText.length > 200)) ||
    (mode === "browse" && queryText)
  ) {
    res.status(400).json({
      status: "unavailable",
      mode,
      query: queryText,
      products: [],
      error:
        "Provide a product search query or an explicit empty browse request",
    });
    return;
  }

  try {
    const query = req.scope.resolve("query");
    const hitById = new Map<string, ProductHit>();
    if (mode === "search") {
      const meilisearch =
        req.scope.resolve<MeilisearchModuleService>(MEILISEARCH_MODULE);
      const result = await meilisearch.search<ProductHit>(
        queryText,
        "product",
        { limit },
      );
      if (
        !Array.isArray(result?.hits) ||
        result.hits.some(
          (hit) =>
            !hit ||
            typeof hit.id !== "string" ||
            !/^[a-zA-Z0-9_-]{1,100}$/.test(hit.id),
        )
      ) {
        throw new Error("Invalid search response");
      }
      for (const hit of result.hits.slice(0, limit)) hitById.set(hit.id!, hit);
      // An empty ID set is an empty search, never permission to browse the catalogue.
      if (hitById.size === 0) {
        respond("empty", []);
        return;
      }
    }
    const ids = [...hitById.keys()];
    const { data } = await query.graph({
      entity: "product",
      fields: productFields,
      filters: {
        status: "published",
        ...(mode === "search" ? { id: ids } : {}),
      },
      pagination: { take: limit },
    });
    if (!Array.isArray(data)) throw new Error("Invalid catalogue response");
    const products = (data as ProductRecord[])
      .filter(
        (product) =>
          Boolean(product?.id) &&
          product.status === "published" &&
          (mode === "browse" || hitById.has(product.id)) &&
          !(
            product.metadata &&
            typeof product.metadata === "object" &&
            "catalogue_role" in product.metadata &&
            product.metadata.catalogue_role === "knowledge_reference"
          ) &&
          (!hasSimulatedInventory(product) ||
            process.env.APP_ENV === "staging"),
      )
      .sort((left, right) =>
        mode === "search" ? ids.indexOf(left.id) - ids.indexOf(right.id) : 0,
      )
      .slice(0, limit);
    if (products.length === 0) {
      respond("empty", []);
      return;
    }
    const strapi = req.scope.resolve<StrapiModuleService>(STRAPI_MODULE);
    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        const description = await strapi
          .getProductDescription(product.id)
          .catch(() => null);
        return {
          ...toProductResponse(product, hitById.get(product.id), description),
          evidence: { kind: "catalogue_discovery", compatibility: "unknown" },
        };
      }),
    );
    const guidance = buildExpertProductGuidance(queryText, enrichedProducts);
    respond(
      "matches",
      enrichedProducts.map((product) => ({
        ...product,
        expertSignals: guidance.productSignalsById[product.id] ?? [],
      })),
      { expertContext: guidance.expertContext },
    );
  } catch {
    res.status(503);
    respond("unavailable", [], {
      error: "Product search is unavailable. Please try again.",
    });
  }
};
