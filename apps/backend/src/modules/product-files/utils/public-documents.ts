import type { MeilisearchProductDocumentFile } from "@3dbyte-tech-store/shared-types";

export type PublicProductDocumentType =
  | "manual"
  | "datasheet"
  | "install_guide"
  | "safety_sheet"
  | "warranty"
  | "other";

export interface PublicProductDocument {
  id: string;
  medusa_product_id: string;
  product_handle: string;
  product_title: string;
  title: string;
  document_type: PublicProductDocumentType;
  file_url: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  version?: string;
  language?: string;
  search_keywords: string[];
  sort_order: number;
  published_at?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => asString(item))
        .filter((item): item is string => Boolean(item))
    : [];
}

function normalizeDocumentType(value: unknown): PublicProductDocumentType {
  const candidate = asString(value);
  const allowed = new Set<PublicProductDocumentType>([
    "manual",
    "datasheet",
    "install_guide",
    "safety_sheet",
    "warranty",
    "other",
  ]);

  return candidate && allowed.has(candidate as PublicProductDocumentType)
    ? (candidate as PublicProductDocumentType)
    : "other";
}

function unwrapStrapiMedia(value: unknown): Record<string, unknown> {
  const media = asRecord(value);
  const data = asRecord(media.data);
  const attributes = asRecord(data.attributes);

  return Object.keys(attributes).length > 0
    ? { ...attributes, id: data.id }
    : media;
}

export function normalizeStrapiProductDocument(
  rawDocument: unknown,
): PublicProductDocument {
  const document = asRecord(rawDocument);
  const file = unwrapStrapiMedia(document.file);
  const id =
    asString(document.documentId) ||
    asString(document.id) ||
    asString(document.slug) ||
    "";

  return {
    id,
    medusa_product_id: asString(document.medusa_product_id) || "",
    product_handle: asString(document.product_handle) || "",
    product_title: asString(document.product_title) || "",
    title: asString(document.title) || asString(file.name) || "Product document",
    document_type: normalizeDocumentType(document.document_type),
    file_url: asString(file.url) || "",
    file_name: asString(file.name) || "download",
    mime_type: asString(file.mime) || "application/octet-stream",
    file_size: asNumber(file.size) || 0,
    version: asString(document.version),
    language: asString(document.language),
    search_keywords: asStringArray(document.search_keywords),
    sort_order: asNumber(document.sort_order) || 0,
    published_at: asString(document.publishedAt),
  };
}

export function toPublicProductDocumentSearchDocument(
  document: PublicProductDocument,
): MeilisearchProductDocumentFile {
  const publishedAt = document.published_at
    ? new Date(document.published_at).getTime()
    : 0;

  return {
    id: document.id,
    medusa_product_id: document.medusa_product_id,
    product_handle: document.product_handle,
    product_title: document.product_title,
    title: document.title,
    document_type: document.document_type,
    version: document.version,
    language: document.language,
    file_name: document.file_name,
    file_size: document.file_size,
    public_download_path: `/store/product-documents/${document.id}/download`,
    search_keywords: document.search_keywords,
    sort_order: document.sort_order,
    published_at_timestamp: Number.isFinite(publishedAt) ? publishedAt : 0,
  };
}
