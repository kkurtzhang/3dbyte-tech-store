import type {
  AiCoreMetadataFormState,
  AiProductMetadataFormState,
  BooleanFormValue,
  RcModelBuildingMetadataFormState,
  ThreeDPrintingMetadataFormState,
} from "./ai-product-metadata-state";

export { emptyAiProductMetadataFormState } from "./ai-product-metadata-state";
export type {
  AiCoreMetadataFormState,
  AiProductMetadataFormState,
  BooleanFormValue,
  RcModelBuildingMetadataFormState,
  ThreeDPrintingMetadataFormState,
} from "./ai-product-metadata-state";

const AI_METADATA_KEYS = [
  "ai_core",
  "three_d_printing",
  "rc_model_building",
] as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function getNumberInput(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : "";
}

function getBooleanInput(
  record: Record<string, unknown>,
  key: string,
): BooleanFormValue {
  const value = record[key];

  if (typeof value !== "boolean") {
    return "";
  }

  return value ? "true" : "false";
}

function getListInput(record: Record<string, unknown>, key: string): string {
  const value = record[key];

  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .join("\n");
}

function getNestedNumberInput(
  record: Record<string, unknown>,
  key: string,
  nestedKey: "min" | "max",
): string {
  const nested = asRecord(record[key]);
  return getNumberInput(nested, nestedKey);
}

function parseString(value: string): string | undefined {
  const trimmedValue = value.trim();
  return trimmedValue || undefined;
}

function parseList(value: string): string[] | undefined {
  const items = value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const uniqueItems = [...new Set(items)];

  return uniqueItems.length ? uniqueItems : undefined;
}

function parseNumber(value: string, label: string): number | undefined {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  const parsedValue = Number(trimmedValue);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`${label} must be a valid number`);
  }

  return parsedValue;
}

function parseBoolean(value: BooleanFormValue): boolean | undefined {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

function dropUndefinedEntries(
  input: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}

function addSchemaIfNonEmpty(
  input: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const withoutUndefined = dropUndefinedEntries(input);

  return Object.keys(withoutUndefined).length
    ? { schema_version: 1, ...withoutUndefined }
    : undefined;
}

function buildTemperatureRange(
  min: string,
  max: string,
  label: string,
): { min?: number; max?: number } | undefined {
  const parsedMin = parseNumber(min, `${label} minimum`);
  const parsedMax = parseNumber(max, `${label} maximum`);

  if (parsedMin === undefined && parsedMax === undefined) {
    return undefined;
  }

  return dropUndefinedEntries({
    min: parsedMin,
    max: parsedMax,
  }) as { min?: number; max?: number };
}

export function buildAiProductMetadataFormState(
  metadata: unknown,
): AiProductMetadataFormState {
  const source = asRecord(metadata);
  const aiCore = asRecord(source.ai_core);
  const threeDPrinting = asRecord(source.three_d_printing);
  const rcModelBuilding = asRecord(source.rc_model_building);

  return {
    aiCore: {
      enabled: Object.keys(aiCore).length > 0,
      productKind: getString(aiCore, "product_kind"),
      audience: getListInput(aiCore, "audience"),
      bestFor: getListInput(aiCore, "best_for"),
      notRecommendedFor: getListInput(aiCore, "not_recommended_for"),
      compatibilityNotes: getListInput(aiCore, "compatibility_notes"),
      careOrSafetyNotes: getListInput(aiCore, "care_or_safety_notes"),
      aiSearchKeywords: getListInput(aiCore, "ai_search_keywords"),
    },
    threeDPrinting: {
      enabled: Object.keys(threeDPrinting).length > 0,
      productKind: getString(threeDPrinting, "product_kind"),
      material: getString(threeDPrinting, "material"),
      diameterMm: getNumberInput(threeDPrinting, "diameter_mm"),
      nozzleDiameterMm: getNumberInput(threeDPrinting, "nozzle_diameter_mm"),
      nozzleTempMinC: getNestedNumberInput(
        threeDPrinting,
        "recommended_nozzle_temp_c",
        "min",
      ),
      nozzleTempMaxC: getNestedNumberInput(
        threeDPrinting,
        "recommended_nozzle_temp_c",
        "max",
      ),
      bedTempMinC: getNestedNumberInput(
        threeDPrinting,
        "recommended_bed_temp_c",
        "min",
      ),
      bedTempMaxC: getNestedNumberInput(
        threeDPrinting,
        "recommended_bed_temp_c",
        "max",
      ),
      maxTemperatureC: getNumberInput(threeDPrinting, "max_temperature_c"),
      requiresEnclosure: getBooleanInput(threeDPrinting, "requires_enclosure"),
      requiresHardenedNozzle: getBooleanInput(
        threeDPrinting,
        "requires_hardened_nozzle",
      ),
      dryingRecommended: getBooleanInput(
        threeDPrinting,
        "drying_recommended",
      ),
      compatiblePrinters: getListInput(
        threeDPrinting,
        "compatible_printers",
      ),
      compatibleBuildSurfaces: getListInput(
        threeDPrinting,
        "compatible_build_surfaces",
      ),
      bestFor: getListInput(threeDPrinting, "best_for"),
      notRecommendedFor: getListInput(threeDPrinting, "not_recommended_for"),
      commonIssues: getListInput(threeDPrinting, "common_issues"),
      aiSearchKeywords: getListInput(threeDPrinting, "ai_search_keywords"),
    },
    rcModelBuilding: {
      enabled: Object.keys(rcModelBuilding).length > 0,
      componentRole: getString(rcModelBuilding, "component_role"),
      compatibleProjectTypes: getListInput(
        rcModelBuilding,
        "compatible_project_types",
      ),
      voltage: getString(rcModelBuilding, "voltage"),
      connectorType: getString(rcModelBuilding, "connector_type"),
      usedFor: getListInput(rcModelBuilding, "used_for"),
      bestFor: getListInput(rcModelBuilding, "best_for"),
      aiSearchKeywords: getListInput(rcModelBuilding, "ai_search_keywords"),
    },
  };
}

function buildAiCoreMetadata(
  state: AiCoreMetadataFormState,
): Record<string, unknown> | undefined {
  if (!state.enabled) {
    return undefined;
  }

  return addSchemaIfNonEmpty({
    product_kind: parseString(state.productKind),
    audience: parseList(state.audience),
    best_for: parseList(state.bestFor),
    not_recommended_for: parseList(state.notRecommendedFor),
    compatibility_notes: parseList(state.compatibilityNotes),
    care_or_safety_notes: parseList(state.careOrSafetyNotes),
    ai_search_keywords: parseList(state.aiSearchKeywords),
  });
}

function buildThreeDPrintingMetadata(
  state: ThreeDPrintingMetadataFormState,
): Record<string, unknown> | undefined {
  if (!state.enabled) {
    return undefined;
  }

  return addSchemaIfNonEmpty({
    product_kind: parseString(state.productKind),
    material: parseString(state.material),
    diameter_mm: parseNumber(state.diameterMm, "Diameter"),
    nozzle_diameter_mm: parseNumber(
      state.nozzleDiameterMm,
      "Nozzle diameter",
    ),
    recommended_nozzle_temp_c: buildTemperatureRange(
      state.nozzleTempMinC,
      state.nozzleTempMaxC,
      "Nozzle temperature",
    ),
    recommended_bed_temp_c: buildTemperatureRange(
      state.bedTempMinC,
      state.bedTempMaxC,
      "Bed temperature",
    ),
    max_temperature_c: parseNumber(
      state.maxTemperatureC,
      "Maximum temperature",
    ),
    requires_enclosure: parseBoolean(state.requiresEnclosure),
    requires_hardened_nozzle: parseBoolean(state.requiresHardenedNozzle),
    drying_recommended: parseBoolean(state.dryingRecommended),
    compatible_printers: parseList(state.compatiblePrinters),
    compatible_build_surfaces: parseList(state.compatibleBuildSurfaces),
    best_for: parseList(state.bestFor),
    not_recommended_for: parseList(state.notRecommendedFor),
    common_issues: parseList(state.commonIssues),
    ai_search_keywords: parseList(state.aiSearchKeywords),
  });
}

function buildRcModelBuildingMetadata(
  state: RcModelBuildingMetadataFormState,
): Record<string, unknown> | undefined {
  if (!state.enabled) {
    return undefined;
  }

  return addSchemaIfNonEmpty({
    component_role: parseString(state.componentRole),
    compatible_project_types: parseList(state.compatibleProjectTypes),
    voltage: parseString(state.voltage),
    connector_type: parseString(state.connectorType),
    used_for: parseList(state.usedFor),
    best_for: parseList(state.bestFor),
    ai_search_keywords: parseList(state.aiSearchKeywords),
  });
}

export function buildAiProductMetadataUpdatePayload(
  existingMetadata: unknown,
  state: AiProductMetadataFormState,
): { metadata: Record<string, unknown> } {
  const metadata = { ...asRecord(existingMetadata) };

  for (const key of AI_METADATA_KEYS) {
    delete metadata[key];
  }

  const aiCore = buildAiCoreMetadata(state.aiCore);
  const threeDPrinting = buildThreeDPrintingMetadata(state.threeDPrinting);
  const rcModelBuilding = buildRcModelBuildingMetadata(state.rcModelBuilding);

  return {
    metadata: {
      ...metadata,
      ...(aiCore ? { ai_core: aiCore } : {}),
      ...(threeDPrinting ? { three_d_printing: threeDPrinting } : {}),
      ...(rcModelBuilding ? { rc_model_building: rcModelBuilding } : {}),
    },
  };
}
