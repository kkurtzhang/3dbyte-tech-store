import type { AiProductMetadataSearchFields } from "@3dbyte-tech-store/shared-types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function getBoolean(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
}

function getStringArray(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return strings.length > 0 ? strings : undefined;
}

function getTemperatureRange(
  record: Record<string, unknown>,
  key: string,
): { min?: number; max?: number } | undefined {
  const value = asRecord(record[key]);

  if (!value) {
    return undefined;
  }

  const min = getNumber(value, "min");
  const max = getNumber(value, "max");

  return min === undefined && max === undefined ? undefined : { min, max };
}

export function flattenAiProductMetadata(
  metadata: unknown,
): AiProductMetadataSearchFields {
  const source = asRecord(metadata);

  if (!source) {
    return {};
  }

  const threeDPrinting = asRecord(source.three_d_printing);
  const rcModelBuilding = asRecord(source.rc_model_building);
  const output: AiProductMetadataSearchFields = {};

  if (threeDPrinting) {
    const nozzleTemp = getTemperatureRange(
      threeDPrinting,
      "recommended_nozzle_temp_c",
    );
    const bedTemp = getTemperatureRange(
      threeDPrinting,
      "recommended_bed_temp_c",
    );

    output.tdp_schema_version = getNumber(threeDPrinting, "schema_version");
    output.tdp_product_kind = getString(threeDPrinting, "product_kind");
    output.tdp_material = getString(threeDPrinting, "material");
    output.tdp_diameter_mm = getNumber(threeDPrinting, "diameter_mm");
    output.tdp_nozzle_temp_min_c = nozzleTemp?.min;
    output.tdp_nozzle_temp_max_c = nozzleTemp?.max;
    output.tdp_bed_temp_min_c = bedTemp?.min;
    output.tdp_bed_temp_max_c = bedTemp?.max;
    output.tdp_requires_enclosure = getBoolean(
      threeDPrinting,
      "requires_enclosure",
    );
    output.tdp_requires_hardened_nozzle = getBoolean(
      threeDPrinting,
      "requires_hardened_nozzle",
    );
    output.tdp_drying_recommended = getBoolean(
      threeDPrinting,
      "drying_recommended",
    );
    output.tdp_compatible_printers = getStringArray(
      threeDPrinting,
      "compatible_printers",
    );
    output.tdp_compatible_build_surfaces = getStringArray(
      threeDPrinting,
      "compatible_build_surfaces",
    );
    output.tdp_best_for = getStringArray(threeDPrinting, "best_for");
    output.tdp_not_recommended_for = getStringArray(
      threeDPrinting,
      "not_recommended_for",
    );
    output.tdp_common_issues = getStringArray(
      threeDPrinting,
      "common_issues",
    );
    output.tdp_ai_search_keywords = getStringArray(
      threeDPrinting,
      "ai_search_keywords",
    );
  }

  if (rcModelBuilding) {
    output.rcb_schema_version = getNumber(rcModelBuilding, "schema_version");
    output.rcb_component_role = getString(rcModelBuilding, "component_role");
    output.rcb_compatible_project_types = getStringArray(
      rcModelBuilding,
      "compatible_project_types",
    );
    output.rcb_voltage = getString(rcModelBuilding, "voltage");
    output.rcb_connector_type = getString(rcModelBuilding, "connector_type");
    output.rcb_used_for = getStringArray(rcModelBuilding, "used_for");
    output.rcb_best_for = getStringArray(rcModelBuilding, "best_for");
    output.rcb_ai_search_keywords = getStringArray(
      rcModelBuilding,
      "ai_search_keywords",
    );
  }

  return Object.fromEntries(
    Object.entries(output).filter(([, value]) => value !== undefined),
  ) as AiProductMetadataSearchFields;
}
