import type { AiReadyCatalogueProduct } from "./catalogue";

type ProductDocumentType =
  | "manual"
  | "datasheet"
  | "install_guide"
  | "safety_sheet"
  | "warranty"
  | "other";

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
  filename: string;
  version: string;
  language: string;
  is_public: true;
  search_keywords: string[];
  sort_order: number;
  pdfTitle: string;
  pdfLines: string[];
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

function createDocument(
  product: AiReadyCatalogueProduct,
  document_type: ProductDocumentType,
  suffix: string,
  title: string,
  sort_order: number,
  extraLines: string[],
): AiReadyProductDocumentSeed {
  const keywords = buildKeywordList(product);

  return {
    title,
    document_type,
    filename: `${product.handle}-${suffix}.pdf`,
    version: "phase-1",
    language: "en",
    is_public: true,
    search_keywords: unique([
      ...keywords,
      document_type.replace(/_/g, " "),
      suffix.replace(/-/g, " "),
    ]),
    sort_order,
    pdfTitle: title,
    pdfLines: [
      product.title,
      `SKU: ${product.sku}`,
      `Handle: ${product.handle}`,
      `Document type: ${document_type.replace(/_/g, " ")}`,
      "",
      product.description,
      "",
      ...extraLines,
      "",
      "Phase 1 AI-ready catalogue document. Verify final fitment, ratings, and safety requirements before customer-facing production use.",
    ],
  };
}

export function buildAiReadyProductDocuments(
  product: AiReadyCatalogueProduct,
): AiReadyProductDocumentSeed[] {
  const tdp = getTdp(product);
  const rcb = getRcb(product);
  const productKind =
    typeof tdp.product_kind === "string" ? tdp.product_kind : undefined;
  const componentRole =
    typeof rcb.component_role === "string" ? rcb.component_role : undefined;
  const specifications = buildSpecifications(product);
  const specLines = Object.entries(specifications).map(
    ([key, value]) => `${key.replace(/_/g, " ")}: ${String(value)}`,
  );
  const documents: AiReadyProductDocumentSeed[] = [];

  documents.push(
    createDocument(
      product,
      productKind === "build_surface" ? "install_guide" : "datasheet",
      productKind === "build_surface" ? "install-guide" : "datasheet",
      `${product.title} ${
        productKind === "build_surface" ? "Install Guide" : "Technical Datasheet"
      }`,
      10,
      [
        "Key specifications:",
        ...specLines,
        "AI search coverage includes compatibility, use case, and troubleshooting keywords.",
      ],
    ),
  );

  if (productKind === "filament") {
    documents.push(
      createDocument(
        product,
        "safety_sheet",
        "safety-sheet",
        `${product.title} Safety and Handling Sheet`,
        20,
        [
          "Store sealed with desiccant when not in use.",
          "Dry moisture-sensitive materials before critical prints.",
          "Use suitable ventilation for heated polymer processing.",
          asBoolean(tdp.requires_hardened_nozzle)
            ? "A hardened nozzle is required for abrasive-filled material."
            : "A brass nozzle is suitable for non-abrasive material.",
        ],
      ),
    );
  } else if (productKind === "nozzle") {
    documents.push(
      createDocument(
        product,
        "install_guide",
        "install-guide",
        `${product.title} Installation Guide`,
        20,
        [
          "Heat the hotend before loosening or final-tightening the nozzle.",
          "Confirm thread compatibility and avoid over-tightening.",
          "Re-run first-layer calibration after nozzle replacement.",
        ],
      ),
    );
  } else if (productKind === "drying_storage" || productKind === "maintenance_tool") {
    documents.push(
      createDocument(
        product,
        "manual",
        "quick-start-manual",
        `${product.title} Quick Start Manual`,
        20,
        [
          "Inspect the tool before use and keep it clean between maintenance sessions.",
          "Use the product only within the intended printer maintenance workflow.",
          "Record maintenance outcomes so assistant guidance has accurate context.",
        ],
      ),
    );
  } else if (componentRole) {
    documents.push(
      createDocument(
        product,
        ["battery", "esc", "drive_motor", "servo"].includes(componentRole)
          ? "safety_sheet"
          : "warranty",
        ["battery", "esc", "drive_motor", "servo"].includes(componentRole)
          ? "safety-sheet"
          : "warranty",
        `${product.title} ${
          ["battery", "esc", "drive_motor", "servo"].includes(componentRole)
            ? "RC Safety Sheet"
            : "Warranty Notes"
        }`,
        20,
        [
          "Match voltage, connector, and load ratings before installation.",
          "Check fasteners, wiring, and moving clearances before powered testing.",
          "Do not expose protected 3DSets model files or paid build instructions.",
        ],
      ),
    );
  } else {
    documents.push(
      createDocument(
        product,
        "warranty",
        "warranty",
        `${product.title} Warranty Notes`,
        20,
        [
          "Keep proof of purchase and product packaging for support enquiries.",
          "Warranty handling depends on correct installation and normal use.",
        ],
      ),
    );
  }

  return documents;
}
