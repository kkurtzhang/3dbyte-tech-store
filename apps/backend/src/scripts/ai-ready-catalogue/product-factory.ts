import type {
  AiReadyCatalogueProductDefinition,
  CatalogueSource,
  RcModelBuildingMetadata,
  ThreeDPrintingMetadata,
} from "./types";

const SOURCE_CHECKED_AT = "2026-05-31" as const;

function createHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function source(
  official_product_url: string,
  official_image_url: string,
  extra: Partial<CatalogueSource> = {},
): CatalogueSource {
  return {
    kind: "official_product_page",
    official_product_url,
    official_image_url,
    source_checked_at: SOURCE_CHECKED_AT,
    image_policy: "official_or_supplier_product_image",
    ...extra,
  };
}

type ProductBase = {
  title: string;
  handle: string;
  sku: string;
  description: string;
  priceAud: number;
  brandName: string;
  brandOriginCountry: string;
  categoryHandle: string;
  collectionHandle: string;
  tags: string[];
  source: CatalogueSource;
  three_d_printing?: ThreeDPrintingMetadata;
  rc_model_building?: RcModelBuildingMetadata;
};

export function product(input: ProductBase): AiReadyCatalogueProductDefinition {
  const {
    three_d_printing,
    rc_model_building,
    source: productSource,
    ...base
  } = input;

  return {
    ...base,
    brandHandle: createHandle(input.brandName),
    source: productSource,
    metadata: {
      ...(three_d_printing ? { three_d_printing } : {}),
      ...(rc_model_building ? { rc_model_building } : {}),
    },
  };
}

export function tdp(
  metadata: Omit<ThreeDPrintingMetadata, "schema_version">,
): ThreeDPrintingMetadata {
  return { schema_version: 1, ...metadata };
}

export function rcb(
  metadata: Omit<RcModelBuildingMetadata, "schema_version">,
): RcModelBuildingMetadata {
  return { schema_version: 1, ...metadata };
}

export const filamentDefaults = {
  diameter_mm: 1.75,
  requires_enclosure: false,
  requires_hardened_nozzle: false,
  drying_recommended: true,
};
