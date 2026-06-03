export type TemperatureRange = {
  min: number;
  max: number;
};

export type ThreeDPrintingMetadata = {
  schema_version: 1;
  product_kind:
    | "filament"
    | "nozzle"
    | "hotend"
    | "build_surface"
    | "drying_storage"
    | "maintenance_tool";
  material?: string;
  diameter_mm?: number;
  nozzle_diameter_mm?: number;
  recommended_nozzle_temp_c?: TemperatureRange;
  recommended_bed_temp_c?: TemperatureRange;
  max_temperature_c?: number;
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

export type RcModelBuildingMetadata = {
  schema_version: 1;
  component_role:
    | "print_material"
    | "drive_motor"
    | "esc"
    | "servo"
    | "bearing_set"
    | "fastener_kit"
    | "connector_pack"
    | "battery"
    | "receiver"
    | "transmitter";
  compatible_project_types?: string[];
  voltage?: string;
  connector_type?: string;
  used_for?: string[];
  best_for?: string[];
  ai_search_keywords?: string[];
};

export type CatalogueSource = {
  kind:
    | "official_product_page"
    | "official_datasheet"
    | "supplier_product_page";
  official_product_url: string;
  official_manual_url?: string;
  official_datasheet_url?: string;
  official_safety_sheet_url?: string;
  official_image_url: string;
  source_checked_at: "2026-05-31";
  image_policy:
    | "official_or_supplier_product_image"
    | "official_product_image_pending_review";
};

export type AiReadyCatalogueProduct = {
  title: string;
  handle: string;
  legacyHandles?: string[];
  sku: string;
  description: string;
  priceAud: number;
  imageUrl: string;
  brandName: string;
  brandHandle: string;
  brandOriginCountry: string;
  categoryHandle: string;
  collectionHandle: string;
  tags: string[];
  options?: AiReadyCatalogueOption[];
  variants?: AiReadyCatalogueVariant[];
  source: CatalogueSource;
  metadata: {
    three_d_printing?: ThreeDPrintingMetadata;
    rc_model_building?: RcModelBuildingMetadata;
  };
};

export type AiReadyCatalogueOption = {
  title: string;
  values: string[];
};

export type AiReadyCatalogueVariant = {
  title: string;
  sku: string;
  priceAud?: number;
  options: Record<string, string>;
  manageInventory?: boolean;
  allowBackorder?: boolean;
  inventoryQuantity?: number;
};

export type AiReadyCatalogueProductDefinition = Omit<
  AiReadyCatalogueProduct,
  "imageUrl"
>;
