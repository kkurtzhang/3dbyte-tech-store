import { CreateProductWorkflowInputDTO } from "@medusajs/framework/types";
import { ProductStatus } from "@medusajs/framework/utils";

import { AI_READY_CATALOGUE_PRODUCT_DEFINITIONS } from "./products";
import type { AiReadyCatalogueProduct } from "./types";

export type {
  AiReadyCatalogueOption,
  AiReadyCatalogueProduct,
  AiReadyCatalogueVariant,
  CatalogueSource,
  RcModelBuildingMetadata,
  ThreeDPrintingMetadata,
} from "./types";

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export const AI_READY_CATALOGUE_PRODUCTS: AiReadyCatalogueProduct[] =
  AI_READY_CATALOGUE_PRODUCT_DEFINITIONS.map((product) => ({
    ...product,
    imageUrl: product.source.official_image_url,
  }));

export function getAiCatalogueCoverage(products: AiReadyCatalogueProduct[]): {
  productKinds: string[];
  componentRoles: string[];
} {
  return {
    productKinds: [
      ...new Set(
        products
          .map((product) => product.metadata.three_d_printing?.product_kind)
          .filter(isPresent),
      ),
    ].sort(),
    componentRoles: [
      ...new Set(
        products
          .map((product) => product.metadata.rc_model_building?.component_role)
          .filter(isPresent),
      ),
    ].sort(),
  };
}

export function buildAiCatalogueProductInput(
  product: AiReadyCatalogueProduct,
  currencyCode = "aud",
): CreateProductWorkflowInputDTO {
  const options = product.options ?? [{ title: "Default", values: ["Default"] }];
  const variants = product.variants ?? [
    {
      title: "Default",
      sku: product.sku,
      options: { Default: "Default" },
    },
  ];

  return {
    title: product.title,
    handle: product.handle,
    description: product.description,
    status: ProductStatus.PUBLISHED,
    is_giftcard: false,
    discountable: true,
    options,
    variants: variants.map((variant) => ({
      title: variant.title,
      sku: variant.sku,
      prices: [
        {
          amount: variant.priceAud ?? product.priceAud,
          currency_code: currencyCode,
        },
      ],
      options: variant.options,
      manage_inventory: variant.manageInventory ?? true,
      allow_backorder: variant.allowBackorder ?? false,
    })),
    metadata: {
      ai_catalogue_seed: false,
      source_backed_catalogue_seed: true,
      source_backed_catalogue_seed_version: 1,
      source: product.source,
      brand: product.brandName,
      brand_handle: product.brandHandle,
      brand_origin_country: product.brandOriginCountry,
      category: product.categoryHandle,
      collection: product.collectionHandle,
      tags: product.tags,
      ...(product.legacyHandles?.length
        ? { legacy_handles: product.legacyHandles }
        : {}),
      ...product.metadata,
    },
    thumbnail: product.imageUrl,
    images: [{ url: product.imageUrl }],
  };
}
