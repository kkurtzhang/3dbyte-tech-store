import type { AiReadyCatalogueProduct } from "./catalogue";

type ProductDocumentType =
  | "manual"
  | "datasheet"
  | "install_guide"
  | "safety_sheet"
  | "warranty"
  | "other";

type ProductDocumentSourceKind =
  | "official_product_page"
  | "official_manual"
  | "official_datasheet"
  | "official_safety_sheet";

type MetadataRecord = Record<string, unknown>;

export type AiReadyProductDescriptionSeed = {
  rich_description: string;
  features: string[];
  specifications: Record<string, string | number | boolean>;
  seo_title: string;
  seo_description: string;
  meta_keywords: string[];
};

export type AiReadyProductDocumentSeed = {
  title: string;
  document_type: ProductDocumentType;
  filename?: string;
  version: string;
  language: string;
  is_public: true;
  search_keywords: string[];
  sort_order: number;
  source_url: string;
  source_kind: ProductDocumentSourceKind;
  source_label: string;
  cache_file: boolean;
};

function asRecord(value: unknown): MetadataRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as MetadataRecord)
    : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function humanize(value: string | undefined): string {
  return (value ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sentenceJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";

  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function temperatureRangeText(value: unknown): string | undefined {
  const range = asRecord(value);
  const min = asNumber(range.min);
  const max = asNumber(range.max);

  return min && max ? `${min}-${max} C` : undefined;
}

function unique(values: string[]): string[] {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  ];
}

function getTdp(product: AiReadyCatalogueProduct): MetadataRecord {
  return asRecord(product.metadata.three_d_printing);
}

function getRcb(product: AiReadyCatalogueProduct): MetadataRecord {
  return asRecord(product.metadata.rc_model_building);
}

function buildSpecifications(
  product: AiReadyCatalogueProduct,
): Record<string, string | number | boolean> {
  const tdp = getTdp(product);
  const rcb = getRcb(product);
  const specifications: Record<string, string | number | boolean> = {
    sku: product.sku,
    price_aud: product.priceAud,
  };
  const material = typeof tdp.material === "string" ? tdp.material : undefined;
  const diameter = asNumber(tdp.diameter_mm);
  const nozzleTemp = temperatureRangeText(tdp.recommended_nozzle_temp_c);
  const bedTemp = temperatureRangeText(tdp.recommended_bed_temp_c);
  const productKind =
    typeof tdp.product_kind === "string" ? tdp.product_kind : undefined;
  const componentRole =
    typeof rcb.component_role === "string" ? rcb.component_role : undefined;
  const voltage = typeof rcb.voltage === "string" ? rcb.voltage : undefined;
  const connectorType =
    typeof rcb.connector_type === "string" ? rcb.connector_type : undefined;

  if (productKind) specifications.printing_product_kind = productKind;
  if (material) specifications.material = material;
  if (diameter) specifications.diameter_mm = diameter;
  if (nozzleTemp) specifications.recommended_nozzle_temp_c = nozzleTemp;
  if (bedTemp) specifications.recommended_bed_temp_c = bedTemp;
  if (typeof tdp.requires_enclosure === "boolean") {
    specifications.requires_enclosure = tdp.requires_enclosure;
  }
  if (typeof tdp.requires_hardened_nozzle === "boolean") {
    specifications.requires_hardened_nozzle = tdp.requires_hardened_nozzle;
  }
  if (typeof tdp.drying_recommended === "boolean") {
    specifications.drying_recommended = tdp.drying_recommended;
  }
  if (componentRole) specifications.rc_component_role = componentRole;
  if (voltage) specifications.voltage = voltage;
  if (connectorType) specifications.connector_type = connectorType;

  return specifications;
}

function buildFeatureBullets(product: AiReadyCatalogueProduct): string[] {
  const tdp = getTdp(product);
  const rcb = getRcb(product);
  const features: string[] = [];
  const material = typeof tdp.material === "string" ? tdp.material : undefined;
  const bestFor = asStringArray(tdp.best_for);
  const compatibleSurfaces = asStringArray(tdp.compatible_build_surfaces);
  const role =
    typeof rcb.component_role === "string" ? humanize(rcb.component_role) : "";
  const usedFor = asStringArray(rcb.used_for);

  if (material && bestFor.length > 0) {
    features.push(`${material} material for ${sentenceJoin(bestFor)}.`);
  }

  if (compatibleSurfaces.length > 0) {
    features.push(
      `Compatible with ${sentenceJoin(compatibleSurfaces)} build surfaces.`,
    );
  }

  if (asBoolean(tdp.requires_hardened_nozzle)) {
    features.push("Use a hardened nozzle for abrasive-filled materials.");
  }

  if (asBoolean(tdp.requires_enclosure)) {
    features.push("Enclosure recommended for stronger layer bonding and warp control.");
  }

  if (asBoolean(tdp.drying_recommended)) {
    features.push("Drying is recommended before critical prints.");
  }

  if (role) {
    features.push(`${role} selected for 3DSets-style RC model assembly.`);
  }

  if (usedFor.length > 0) {
    features.push(`Useful for ${sentenceJoin(usedFor)}.`);
  }

  features.push("Indexed with structured metadata for AI-assisted product guidance.");

  return unique(features).slice(0, 6);
}

function buildKeywordList(product: AiReadyCatalogueProduct): string[] {
  const tdp = getTdp(product);
  const rcb = getRcb(product);
  const material = typeof tdp.material === "string" ? tdp.material : undefined;
  const productKind =
    typeof tdp.product_kind === "string" ? humanize(tdp.product_kind) : undefined;
  const componentRole =
    typeof rcb.component_role === "string"
      ? humanize(rcb.component_role)
      : undefined;

  return unique([
    product.title,
    product.handle,
    product.sku,
    material ?? "",
    productKind ?? "",
    componentRole ?? "",
    ...asStringArray(tdp.ai_search_keywords),
    ...asStringArray(rcb.ai_search_keywords),
    ...asStringArray(tdp.best_for),
    ...asStringArray(rcb.best_for),
    asBoolean(tdp.requires_hardened_nozzle) ? "hardened nozzle" : "",
    asBoolean(tdp.drying_recommended) ? "filament drying" : "",
    "AI-ready product",
  ]);
}

export function buildAiReadyProductDescription(
  product: AiReadyCatalogueProduct,
): AiReadyProductDescriptionSeed {
  const tdp = getTdp(product);
  const rcb = getRcb(product);
  const features = buildFeatureBullets(product);
  const specifications = buildSpecifications(product);
  const keywords = buildKeywordList(product);
  const productKind =
    typeof tdp.product_kind === "string"
      ? humanize(tdp.product_kind).toLowerCase()
      : "3D printing and RC build component";
  const role =
    typeof rcb.component_role === "string"
      ? humanize(rcb.component_role).toLowerCase()
      : "";
  const nozzleTemp = temperatureRangeText(tdp.recommended_nozzle_temp_c);
  const bedTemp = temperatureRangeText(tdp.recommended_bed_temp_c);
  const tempCopy =
    nozzleTemp || bedTemp
      ? ` The recommended print window is${nozzleTemp ? ` ${nozzleTemp} nozzle` : ""}${
          bedTemp ? `${nozzleTemp ? " and" : ""} ${bedTemp} bed` : ""
        }, with final tuning based on printer, chamber, and surface.`
      : "";
  const rcCopy = role
    ? ` For 3DSets-style RC builds, this item is treated as a ${role} and should be checked against the model bill of materials before assembly.`
    : "";
  const featureList = features.map((feature) => `<li>${feature}</li>`).join("");

  return {
    rich_description: `<p><strong>${product.title}</strong> is an AI-ready ${productKind} selected for practical 3D printing workflows, maintenance decisions, and compatibility guidance. It keeps commerce data in Medusa while exposing structured metadata to search and the shopping assistant.</p>

<p>${product.description}${tempCopy}${rcCopy}</p>

<h3>Why it is useful</h3>
<ul>${featureList}</ul>

<h3>Selection notes</h3>
<p>Use the listed temperatures, material notes, connector details, and RC assembly role as a starting point. Confirm fitment, electrical ratings, and safety requirements against the product documents before final installation or high-load use.</p>`,
    features,
    specifications,
    seo_title: `${product.title} | 3D Byte Tech`,
    seo_description: `${product.title} with AI-ready metadata, product documents, and storefront guidance for Australian 3D printing and RC build workflows.`,
    meta_keywords: keywords,
  };
}

function getSourceHostname(sourceUrl: string): string {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isPdfUrl(sourceUrl: string): boolean {
  try {
    return new URL(sourceUrl).pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return false;
  }
}

function createSourceDocument(
  product: AiReadyCatalogueProduct,
  document_type: ProductDocumentType,
  suffix: string,
  title: string,
  sort_order: number,
  source_url: string,
  source_kind: ProductDocumentSourceKind,
  source_label: string,
): AiReadyProductDocumentSeed {
  const keywords = buildKeywordList(product);
  const hostname = getSourceHostname(source_url);
  const cacheFile = isPdfUrl(source_url);

  return {
    title,
    document_type,
    filename: cacheFile ? `${product.handle}-${suffix}.pdf` : undefined,
    version: `official-${product.source.source_checked_at}`,
    language: "en",
    is_public: true,
    search_keywords: unique([
      ...keywords,
      source_label,
      hostname,
      "official manufacturer source",
      document_type.replace(/_/g, " "),
      suffix.replace(/-/g, " "),
    ]),
    sort_order,
    source_url,
    source_kind,
    source_label,
    cache_file: cacheFile,
  };
}

export function buildAiReadyProductDocuments(
  product: AiReadyCatalogueProduct,
): AiReadyProductDocumentSeed[] {
  const documents: AiReadyProductDocumentSeed[] = [];

  documents.push(
    createSourceDocument(
      product,
      "other",
      "official-product-page",
      `${product.title} Official Product Page`,
      10,
      product.source.official_product_url,
      "official_product_page",
      "Official product page",
    ),
  );

  if (product.source.official_datasheet_url) {
    documents.push(
      createSourceDocument(
        product,
        "datasheet",
        "official-datasheet",
        `${product.title} Official Technical Datasheet`,
        20,
        product.source.official_datasheet_url,
        "official_datasheet",
        "Official technical datasheet",
      ),
    );
  }

  if (product.source.official_safety_sheet_url) {
    documents.push(
      createSourceDocument(
        product,
        "safety_sheet",
        "official-safety-sheet",
        `${product.title} Official Safety Sheet`,
        30,
        product.source.official_safety_sheet_url,
        "official_safety_sheet",
        "Official safety sheet",
      ),
    );
  }

  if (product.source.official_manual_url) {
    documents.push(
      createSourceDocument(
        product,
        "manual",
        "official-manual",
        `${product.title} Official Manual or Support Guide`,
        40,
        product.source.official_manual_url,
        "official_manual",
        "Official manual or support guide",
      ),
    );
  }

  return documents;
}
