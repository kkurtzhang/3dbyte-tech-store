import { CreateProductWorkflowInputDTO } from "@medusajs/framework/types";
import { ProductStatus } from "@medusajs/framework/utils";

type TemperatureRange = {
  min: number;
  max: number;
};

type ThreeDPrintingMetadata = {
  schema_version: 1;
  product_kind:
    | "filament"
    | "nozzle"
    | "build_surface"
    | "drying_storage"
    | "maintenance_tool";
  material?: string;
  diameter_mm?: number;
  recommended_nozzle_temp_c?: TemperatureRange;
  recommended_bed_temp_c?: TemperatureRange;
  requires_enclosure?: boolean;
  requires_hardened_nozzle?: boolean;
  drying_recommended?: boolean;
  compatible_printers?: string[];
  compatible_build_surfaces?: string[];
  best_for?: string[];
  not_recommended_for?: string[];
  common_issues?: string[];
  ai_search_keywords?: string[];
};

type RcModelBuildingMetadata = {
  schema_version: 1;
  component_role:
    | "print_material"
    | "drive_motor"
    | "esc"
    | "servo"
    | "bearing_set"
    | "fastener_kit"
    | "connector_pack"
    | "battery";
  compatible_project_types?: string[];
  voltage?: string;
  connector_type?: string;
  used_for?: string[];
  best_for?: string[];
  ai_search_keywords?: string[];
};

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/$/, "");
}

function isHttpOrigin(value: string | undefined): value is string {
  const trimmedValue = value?.trim();

  return Boolean(trimmedValue && /^https?:\/\//.test(trimmedValue));
}

function getFirstStoreCorsOrigin(): string | undefined {
  return process.env.STORE_CORS?.split(",")
    .map((origin) => origin.trim())
    .find(isHttpOrigin);
}

function getAiCatalogueMediaBaseUrl(): string {
  return trimTrailingSlash(
    [
      process.env.AI_CATALOGUE_MEDIA_BASE_URL,
      process.env.STOREFRONT_URL,
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.SERVICE_FQDN_STOREFRONT,
      process.env.SERVICE_URL_STOREFRONT,
      getFirstStoreCorsOrigin(),
    ].find(isHttpOrigin) ?? "https://store.example.com.au",
  );
}

export function buildAiCatalogueProductImageUrl(handle: string): string {
  return `${getAiCatalogueMediaBaseUrl()}/ai-catalogue/products/${handle}.png`;
}

export type AiReadyCatalogueProduct = {
  title: string;
  handle: `ai-${string}`;
  sku: string;
  description: string;
  priceAud: number;
  imageUrl: string;
  metadata: {
    three_d_printing?: ThreeDPrintingMetadata;
    rc_model_building?: RcModelBuildingMetadata;
  };
};

type AiReadyCatalogueProductDefinition = Omit<
  AiReadyCatalogueProduct,
  "imageUrl"
>;

const AI_READY_CATALOGUE_PRODUCT_DEFINITIONS: AiReadyCatalogueProductDefinition[] = [
  {
    title: "AI PETG Black 1.75mm 1kg",
    handle: "ai-petg-black-175-1kg",
    sku: "AI-FIL-PETG-BLK-175-1KG",
    description:
      "Reliable PETG filament for functional 3D prints and light-duty outdoor RC body or bracket parts.",
    priceAud: 32.95,
    metadata: {
      three_d_printing: {
        schema_version: 1,
        product_kind: "filament",
        material: "PETG",
        diameter_mm: 1.75,
        recommended_nozzle_temp_c: { min: 230, max: 250 },
        recommended_bed_temp_c: { min: 70, max: 85 },
        requires_enclosure: false,
        requires_hardened_nozzle: false,
        drying_recommended: true,
        compatible_build_surfaces: ["textured_pei", "satin_pei"],
        best_for: ["functional parts", "3DSets body panels"],
        not_recommended_for: ["high-temperature parts"],
        common_issues: ["stringing"],
        ai_search_keywords: ["PETG filament", "outdoor prints"],
      },
      rc_model_building: {
        schema_version: 1,
        component_role: "print_material",
        compatible_project_types: ["3d_printed_rc_car"],
        used_for: ["body panels", "light-duty brackets"],
        best_for: ["3DSets-style RC builds"],
        ai_search_keywords: ["3DSets filament", "RC body filament"],
      },
    },
  },
  {
    title: "AI PLA+ White 1.75mm 1kg",
    handle: "ai-pla-plus-white-175-1kg",
    sku: "AI-FIL-PLAP-WHT-175-1KG",
    description: "Easy-print PLA+ for visual parts, prototypes, and beginner prints.",
    priceAud: 28.95,
    metadata: {
      three_d_printing: {
        schema_version: 1,
        product_kind: "filament",
        material: "PLA+",
        diameter_mm: 1.75,
        recommended_nozzle_temp_c: { min: 200, max: 220 },
        recommended_bed_temp_c: { min: 50, max: 60 },
        requires_enclosure: false,
        requires_hardened_nozzle: false,
        drying_recommended: false,
        compatible_build_surfaces: ["smooth_pei", "textured_pei"],
        best_for: ["beginner prints", "visual parts"],
        not_recommended_for: ["hot car interiors", "load-bearing RC parts"],
        ai_search_keywords: ["PLA+ filament", "beginner filament"],
      },
      rc_model_building: {
        schema_version: 1,
        component_role: "print_material",
        compatible_project_types: ["3d_printed_rc_car"],
        used_for: ["mockups", "body detail parts"],
        best_for: ["non-load-bearing RC details"],
      },
    },
  },
  {
    title: "AI ASA Grey 1.75mm 1kg",
    handle: "ai-asa-grey-175-1kg",
    sku: "AI-FIL-ASA-GRY-175-1KG",
    description: "UV-resistant ASA filament for stronger outdoor-capable prints.",
    priceAud: 44.95,
    metadata: {
      three_d_printing: {
        schema_version: 1,
        product_kind: "filament",
        material: "ASA",
        diameter_mm: 1.75,
        recommended_nozzle_temp_c: { min: 245, max: 265 },
        recommended_bed_temp_c: { min: 90, max: 105 },
        requires_enclosure: true,
        requires_hardened_nozzle: false,
        drying_recommended: true,
        compatible_build_surfaces: ["textured_pei", "garolite"],
        best_for: ["UV-exposed parts", "outdoor RC parts"],
        not_recommended_for: ["open-frame beginner printers"],
        common_issues: ["warping"],
        ai_search_keywords: ["ASA filament", "UV resistant filament"],
      },
    },
  },
  {
    title: "AI TPU 95A Black 1.75mm 500g",
    handle: "ai-tpu-95a-black-175-500g",
    sku: "AI-FIL-TPU95A-BLK-175-500G",
    description: "Flexible TPU for bumpers, tires, pads, and vibration-resistant parts.",
    priceAud: 36.95,
    metadata: {
      three_d_printing: {
        schema_version: 1,
        product_kind: "filament",
        material: "TPU 95A",
        diameter_mm: 1.75,
        recommended_nozzle_temp_c: { min: 220, max: 240 },
        recommended_bed_temp_c: { min: 40, max: 60 },
        requires_enclosure: false,
        requires_hardened_nozzle: false,
        drying_recommended: true,
        compatible_build_surfaces: ["textured_pei"],
        best_for: ["flexible bumpers", "vibration pads"],
        not_recommended_for: ["rigid brackets"],
        common_issues: ["stringing", "feeding difficulty"],
        ai_search_keywords: ["TPU filament", "flexible filament"],
      },
      rc_model_building: {
        schema_version: 1,
        component_role: "print_material",
        compatible_project_types: ["3d_printed_rc_car"],
        used_for: ["bumpers", "pads", "tires"],
      },
    },
  },
  {
    title: "AI PC Blend Natural 1.75mm 750g",
    handle: "ai-pc-blend-natural-175-750g",
    sku: "AI-FIL-PCBLEND-NAT-175-750G",
    description: "Tough PC blend for higher-strength printer and RC components.",
    priceAud: 59.95,
    metadata: {
      three_d_printing: {
        schema_version: 1,
        product_kind: "filament",
        material: "PC Blend",
        diameter_mm: 1.75,
        recommended_nozzle_temp_c: { min: 260, max: 285 },
        recommended_bed_temp_c: { min: 100, max: 115 },
        requires_enclosure: true,
        requires_hardened_nozzle: false,
        drying_recommended: true,
        compatible_build_surfaces: ["garolite", "engineering_plate"],
        best_for: ["strong mechanical parts", "heat-resistant brackets"],
        not_recommended_for: ["beginner printers"],
        common_issues: ["warping", "moisture sensitivity"],
      },
    },
  },
  {
    title: "AI PLA-CF Matte Black 1.75mm 1kg",
    handle: "ai-pla-cf-matte-black-175-1kg",
    sku: "AI-FIL-PLACF-BLK-175-1KG",
    description: "Carbon-fibre-filled PLA for stiff matte parts with low warp.",
    priceAud: 49.95,
    metadata: {
      three_d_printing: {
        schema_version: 1,
        product_kind: "filament",
        material: "PLA-CF",
        diameter_mm: 1.75,
        recommended_nozzle_temp_c: { min: 205, max: 225 },
        recommended_bed_temp_c: { min: 50, max: 65 },
        requires_enclosure: false,
        requires_hardened_nozzle: true,
        drying_recommended: true,
        compatible_build_surfaces: ["textured_pei"],
        best_for: ["stiff cosmetic parts", "matte RC body details"],
        not_recommended_for: ["brass nozzle users"],
        ai_search_keywords: ["carbon fibre PLA", "hardened nozzle filament"],
      },
    },
  },
  {
    title: "AI PETG-CF Black 1.75mm 1kg",
    handle: "ai-petg-cf-black-175-1kg",
    sku: "AI-FIL-PETGCF-BLK-175-1KG",
    description: "Carbon-fibre PETG for stiffer functional parts with improved dimensional stability.",
    priceAud: 54.95,
    metadata: {
      three_d_printing: {
        schema_version: 1,
        product_kind: "filament",
        material: "PETG-CF",
        diameter_mm: 1.75,
        recommended_nozzle_temp_c: { min: 240, max: 260 },
        recommended_bed_temp_c: { min: 75, max: 90 },
        requires_enclosure: false,
        requires_hardened_nozzle: true,
        drying_recommended: true,
        compatible_build_surfaces: ["textured_pei", "satin_pei"],
        best_for: ["stiff functional parts", "RC brackets"],
        not_recommended_for: ["brass nozzle users"],
        common_issues: ["abrasive wear"],
      },
    },
  },
  {
    title: "AI Breakaway Support 1.75mm 500g",
    handle: "ai-breakaway-support-175-500g",
    sku: "AI-FIL-SUPPORT-175-500G",
    description: "Breakaway support material for multi-material prints.",
    priceAud: 39.95,
    metadata: {
      three_d_printing: {
        schema_version: 1,
        product_kind: "filament",
        material: "Breakaway Support",
        diameter_mm: 1.75,
        recommended_nozzle_temp_c: { min: 210, max: 230 },
        recommended_bed_temp_c: { min: 50, max: 70 },
        requires_enclosure: false,
        requires_hardened_nozzle: false,
        drying_recommended: true,
        best_for: ["support interfaces", "complex geometry"],
        not_recommended_for: ["standalone parts"],
      },
    },
  },
  ...[
    ["AI Brass V6 Nozzle 0.4mm", "ai-brass-v6-nozzle-04", "AI-NOZ-BR-V6-04", 8.95, "brass", false],
    ["AI Brass V6 Nozzle 0.6mm", "ai-brass-v6-nozzle-06", "AI-NOZ-BR-V6-06", 9.95, "brass", false],
    ["AI Hardened Steel V6 Nozzle 0.4mm", "ai-hardened-steel-v6-nozzle-04", "AI-NOZ-HS-V6-04", 16.95, "hardened_steel", true],
    ["AI Hardened Steel V6 Nozzle 0.6mm", "ai-hardened-steel-v6-nozzle-06", "AI-NOZ-HS-V6-06", 17.95, "hardened_steel", true],
    ["AI High-Flow Hotend Spare", "ai-high-flow-hotend-spare", "AI-HOTEND-HF-SPARE", 69.95, "copper_alloy", true],
  ].map(([title, handle, sku, priceAud, material, abrasiveReady]) => ({
    title: title as string,
    handle: handle as `ai-${string}`,
    sku: sku as string,
    description: `${title} for printer maintenance and material compatibility testing.`,
    priceAud: priceAud as number,
    metadata: {
      three_d_printing: {
        schema_version: 1 as const,
        product_kind: "nozzle" as const,
        material: material as string,
        requires_hardened_nozzle: false,
        compatible_printers: ["V6-compatible hotends"],
        best_for: abrasiveReady
          ? ["abrasive filaments", "carbon-fibre materials"]
          : ["PLA", "PETG", "general printing"],
        not_recommended_for: abrasiveReady ? [] : ["abrasive filaments"],
        ai_search_keywords: ["V6 nozzle", "3D printer nozzle"],
      },
    },
  })),
  ...[
    ["AI Textured PEI Build Plate 235mm", "ai-textured-pei-build-plate-235", "AI-PLATE-TPEI-235", 29.95, ["PLA", "PETG", "TPU"]],
    ["AI Smooth PEI Build Plate 235mm", "ai-smooth-pei-build-plate-235", "AI-PLATE-SPEI-235", 29.95, ["PLA", "ABS", "ASA"]],
    ["AI Garolite Engineering Plate 235mm", "ai-garolite-engineering-plate-235", "AI-PLATE-GARO-235", 34.95, ["PA", "PC Blend"]],
    ["AI Bed Adhesion Release Stick", "ai-bed-adhesion-release-stick", "AI-ADH-RELEASE-STICK", 12.95, ["PETG", "TPU"]],
  ].map(([title, handle, sku, priceAud, materials]) => ({
    title: title as string,
    handle: handle as `ai-${string}`,
    sku: sku as string,
    description: `${title} for controlled bed adhesion and repeatable first layers.`,
    priceAud: priceAud as number,
    metadata: {
      three_d_printing: {
        schema_version: 1 as const,
        product_kind: "build_surface" as const,
        compatible_build_surfaces: [handle as string],
        best_for: materials as string[],
        ai_search_keywords: ["build plate", "bed adhesion"],
      },
    },
  })),
  ...[
    ["AI Filament Dryer Box", "ai-filament-dryer-box", "AI-DRYER-BOX", 79.95, "drying_storage"],
    ["AI Desiccant Storage Pack", "ai-desiccant-storage-pack", "AI-DESICCANT-PACK", 14.95, "drying_storage"],
    ["AI Nozzle Cleaning Needle Set", "ai-nozzle-cleaning-needle-set", "AI-TOOL-NOZZLE-CLEAN", 9.95, "maintenance_tool"],
    ["AI Digital Caliper 150mm", "ai-digital-caliper-150mm", "AI-TOOL-CALIPER-150", 24.95, "maintenance_tool"],
  ].map(([title, handle, sku, priceAud, productKind]) => ({
    title: title as string,
    handle: handle as `ai-${string}`,
    sku: sku as string,
    description: `${title} for AI-ready 3D printing setup, maintenance, and troubleshooting workflows.`,
    priceAud: priceAud as number,
    metadata: {
      three_d_printing: {
        schema_version: 1 as const,
        product_kind: productKind as "drying_storage" | "maintenance_tool",
        best_for: ["printer maintenance", "material troubleshooting"],
        ai_search_keywords: ["3D printing maintenance", "filament care"],
      },
    },
  })),
  ...[
    ["AI 540 Brushed Motor", "ai-540-brushed-motor", "AI-RC-MOTOR-540", 21.95, "drive_motor", "7.4V", "bullet_35mm"],
    ["AI 45A Brushed ESC", "ai-45a-brushed-esc", "AI-RC-ESC-45A", 36.95, "esc", "7.4V", "XT60"],
    ["AI Metal Gear Steering Servo", "ai-metal-gear-steering-servo", "AI-RC-SERVO-MG", 29.95, "servo", "6V", "JR"],
    ["AI 5x10x4 Bearing Set", "ai-5x10x4-bearing-set", "AI-RC-BEARING-5X10X4", 11.95, "bearing_set", undefined, undefined],
    ["AI M3 RC Fastener Kit", "ai-m3-rc-fastener-kit", "AI-RC-FASTENER-M3", 18.95, "fastener_kit", undefined, undefined],
    ["AI XT60 Connector Pack", "ai-xt60-connector-pack", "AI-RC-XT60-PACK", 8.95, "connector_pack", "60A", "XT60"],
    ["AI 2S LiPo Battery 2200mAh", "ai-2s-lipo-battery-2200mah", "AI-RC-BAT-2S-2200", 34.95, "battery", "7.4V", "XT60"],
    ["AI RC Shock Hardware Pack", "ai-rc-shock-hardware-pack", "AI-RC-SHOCK-HW", 15.95, "fastener_kit", undefined, undefined],
  ].map(([title, handle, sku, priceAud, role, voltage, connector]) => ({
    title: title as string,
    handle: handle as `ai-${string}`,
    sku: sku as string,
    description: `${title} for 3DSets-style 3D printed RC model assembly.`,
    priceAud: priceAud as number,
    metadata: {
      rc_model_building: {
        schema_version: 1 as const,
        component_role: role as RcModelBuildingMetadata["component_role"],
        compatible_project_types: ["3d_printed_rc_car"],
        voltage: voltage as string | undefined,
        connector_type: connector as string | undefined,
        used_for: ["3DSets-style RC model assembly"],
        best_for: ["RC build hardware"],
        ai_search_keywords: ["3DSets RC", "3D printed RC car"],
      },
    },
  })),
];

export const AI_READY_CATALOGUE_PRODUCTS: AiReadyCatalogueProduct[] =
  AI_READY_CATALOGUE_PRODUCT_DEFINITIONS.map((product) => ({
    ...product,
    imageUrl: buildAiCatalogueProductImageUrl(product.handle),
  }));

export function getAiCatalogueCoverage(
  products: AiReadyCatalogueProduct[],
): { productKinds: string[]; componentRoles: string[] } {
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
  return {
    title: product.title,
    handle: product.handle,
    description: product.description,
    status: ProductStatus.PUBLISHED,
    is_giftcard: false,
    discountable: true,
    options: [{ title: "Default", values: ["Default"] }],
    variants: [
      {
        title: "Default",
        sku: product.sku,
        prices: [{ amount: product.priceAud, currency_code: currencyCode }],
        options: { Default: "Default" },
        manage_inventory: false,
        allow_backorder: true,
      },
    ],
    metadata: {
      ai_catalogue_seed: true,
      ai_catalogue_seed_version: 1,
      source: "3dbyte-ai-ready-catalogue",
      ...product.metadata,
    },
    thumbnail: product.imageUrl,
    images: [{ url: product.imageUrl }],
  };
}
