import { ExecArgs, IProductModuleService } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";

import {
  AI_READY_CATALOGUE_PRODUCTS,
  type AiReadyCatalogueProduct,
} from "./ai-ready-catalogue/catalogue";
import {
  buildAiReadyProductDescription,
  buildAiReadyProductDocuments,
  type AiReadyProductDocumentSeed,
} from "./ai-ready-catalogue/content";

export type SeedLogger = {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
};

type MedusaProduct = {
  id: string;
  title?: string | null;
  handle?: string | null;
};

type StrapiEntry = Record<string, unknown> & {
  documentId?: string;
  id?: number | string;
};

type StrapiUploadFile = {
  id?: number | string;
};

type StrapiClient = {
  apiUrl: string;
  token: string;
};

type SeedResult = {
  descriptionsCreated: number;
  descriptionsUpdated: number;
  documentsCreated: number;
  documentsUpdated: number;
  documentsRetired: number;
  productsProcessed: number;
};

const DEFAULT_STRAPI_API_URL = "http://cms:1337";
const MAX_SOURCE_DOCUMENT_BYTES = 12 * 1024 * 1024;
const SOURCE_DOCUMENT_FETCH_TIMEOUT_MS = 15_000;
const MAX_SOURCE_DOCUMENT_REDIRECTS = 5;

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/$/, "");
}

function getStrapiApiUrl(): string {
  return trimTrailingSlash(
    process.env.STRAPI_API_URL ||
      process.env.STRAPI_URL ||
      DEFAULT_STRAPI_API_URL,
  );
}

function getStrapiToken(): string {
  const token = process.env.STRAPI_API_TOKEN?.trim();

  if (!token) {
    throw new Error("STRAPI_API_TOKEN is required to seed AI-ready CMS content.");
  }

  return token;
}

function encodeFilter(field: string, value: string): string {
  return `filters[${field}][$eq]=${encodeURIComponent(value)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function getEntryFile(entry: unknown): Record<string, unknown> {
  const record = asRecord(entry);
  const file = asRecord(record.file);
  const data = asRecord(file.data);
  const attributes = asRecord(data.attributes);

  return Object.keys(attributes).length > 0 ? attributes : file;
}

function hasFileExtension(filename: string): boolean {
  return /\.[a-z0-9]{2,8}$/i.test(filename);
}

function toSourceCheckedAtDatetime(value: string): string {
  return `${value}T00:00:00.000Z`;
}

function isBlockedSourceHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  return (
    normalized === "localhost" ||
    normalized.endsWith(".local") ||
    normalized === "0.0.0.0" ||
    normalized === "127.0.0.1" ||
    normalized.startsWith("127.") ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
  );
}

function parseSourceDocumentUrl(sourceUrl: string): URL {
  const url = new URL(sourceUrl);

  if (url.protocol !== "https:") {
    throw new Error(`Unsupported source document protocol for ${sourceUrl}`);
  }

  if (isBlockedSourceHost(url.hostname)) {
    throw new Error(`Blocked private source document host for ${sourceUrl}`);
  }

  return url;
}

function isRedirectResponse(response: Response): boolean {
  return [301, 302, 303, 307, 308].includes(response.status);
}

function resolveRedirectUrl(currentUrl: URL, location: string): URL {
  return parseSourceDocumentUrl(new URL(location, currentUrl).href);
}

export async function fetchSourceDocumentResponse(
  sourceUrl: string,
  documentTitle: string,
  logger: Pick<SeedLogger, "warn">,
): Promise<Response | undefined> {
  let currentUrl: URL;

  try {
    currentUrl = parseSourceDocumentUrl(sourceUrl);
  } catch (error) {
    logger.warn(
      `Skipping source file cache for ${documentTitle}: ${error instanceof Error ? error.message : "source URL is not allowed"}.`,
    );
    return undefined;
  }

  for (
    let redirectCount = 0;
    redirectCount <= MAX_SOURCE_DOCUMENT_REDIRECTS;
    redirectCount += 1
  ) {
    const abortController = new AbortController();
    const timeout = setTimeout(
      () => abortController.abort(),
      SOURCE_DOCUMENT_FETCH_TIMEOUT_MS,
    );
    let response: Response;

    try {
      response = await fetch(currentUrl, {
        redirect: "manual",
        signal: abortController.signal,
      });
    } catch (error) {
      logger.warn(
        `Skipping source file cache for ${documentTitle}: ${error instanceof Error ? error.message : "fetch failed"}.`,
      );
      return undefined;
    } finally {
      clearTimeout(timeout);
    }

    if (!isRedirectResponse(response)) {
      return response;
    }

    const location = response.headers.get("location");

    if (!location) {
      logger.warn(
        `Skipping source file cache for ${documentTitle}: upstream redirect is missing a location.`,
      );
      return undefined;
    }

    try {
      currentUrl = resolveRedirectUrl(currentUrl, location);
    } catch (error) {
      logger.warn(
        `Skipping source file cache for ${documentTitle}: ${error instanceof Error ? error.message : "redirect target is not allowed"}.`,
      );
      return undefined;
    }
  }

  logger.warn(
    `Skipping source file cache for ${documentTitle}: too many redirects.`,
  );
  return undefined;
}

export function isPdfDocumentBody(body: ArrayBuffer): boolean {
  const bytes = new Uint8Array(body.slice(0, 5));
  const signature = String.fromCharCode(...bytes);

  return signature === "%PDF-";
}

export function shouldReplaceAiReadyDocumentFile(
  existing: unknown,
  document: Pick<AiReadyProductDocumentSeed, "filename">,
): boolean {
  if (!document.filename) {
    return false;
  }

  const file = getEntryFile(existing);
  const fileName = asString(file.name);
  const mime = asString(file.mime)?.toLowerCase();

  return (
    !fileName ||
    !hasFileExtension(fileName) ||
    fileName !== document.filename ||
    mime !== "application/pdf"
  );
}

export function shouldRetireLegacyAiReadyDocument(
  existing: unknown,
  desiredTitles: Set<string>,
): boolean {
  const entry = asRecord(existing);
  const title = asString(entry.title);
  const version = asString(entry.version);
  const file = getEntryFile(existing);
  const fileName = asString(file.name) || "";
  const mime = asString(file.mime)?.toLowerCase();

  return (
    Boolean(asString(entry.documentId)) &&
    asBoolean(entry.is_public) &&
    Boolean(title) &&
    !desiredTitles.has(title as string) &&
    (mime === "text/plain" ||
      !hasFileExtension(fileName) ||
      version === "phase-1")
  );
}

async function strapiJson<T>(
  client: StrapiClient,
  endpoint: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${client.apiUrl}/api/${endpoint}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${client.token}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Strapi ${endpoint} failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<T>;
}

async function uploadSourceDocumentFile(
  client: StrapiClient,
  document: AiReadyProductDocumentSeed,
  logger: SeedLogger,
): Promise<StrapiUploadFile> {
  if (!document.cache_file || !document.filename) {
    return {};
  }

  const sourceResponse = await fetchSourceDocumentResponse(
    document.source_url,
    document.title,
    logger,
  );

  if (!sourceResponse) {
    return {};
  }

  if (!sourceResponse.ok) {
    logger.warn(
      `Skipping source file cache for ${document.title}: upstream returned ${sourceResponse.status}.`,
    );
    return {};
  }

  const contentLength = Number(sourceResponse.headers.get("content-length"));

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_SOURCE_DOCUMENT_BYTES
  ) {
    logger.warn(
      `Skipping source file cache for ${document.title}: source file is too large.`,
    );
    return {};
  }

  const body = await sourceResponse.arrayBuffer();

  if (body.byteLength > MAX_SOURCE_DOCUMENT_BYTES) {
    logger.warn(
      `Skipping source file cache for ${document.title}: downloaded file is too large.`,
    );
    return {};
  }

  if (!isPdfDocumentBody(body)) {
    logger.warn(
      `Skipping source file cache for ${document.title}: downloaded file is not a PDF.`,
    );
    return {};
  }

  const formData = new FormData();
  const blob = new Blob([body], { type: "application/pdf" });
  formData.append("files", blob, document.filename);

  const response = await fetch(`${client.apiUrl}/api/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${client.token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Strapi upload failed: ${response.status} ${body}`);
  }

  const files = (await response.json()) as StrapiUploadFile[];
  const uploadedFile = files[0];

  if (!uploadedFile?.id) {
    throw new Error(`Strapi upload did not return a file id for ${document.filename}`);
  }

  return uploadedFile;
}

async function findStrapiEntry(
  client: StrapiClient,
  collection: string,
  filters: string[],
  populate = "",
): Promise<StrapiEntry | null> {
  const filterQuery = filters.join("&");
  const baseQuery = `${collection}?${filterQuery}${populate}&pagination[pageSize]=1`;
  const published = await strapiJson<{ data?: StrapiEntry[] }>(
    client,
    baseQuery,
  );

  if (published.data?.[0]) return published.data[0];

  const draft = await strapiJson<{ data?: StrapiEntry[] }>(
    client,
    `${baseQuery}&status=draft`,
  );

  return draft.data?.[0] ?? null;
}

async function listStrapiEntries(
  client: StrapiClient,
  collection: string,
  filters: string[],
  populate = "",
): Promise<StrapiEntry[]> {
  const filterQuery = filters.join("&");
  const response = await strapiJson<{ data?: StrapiEntry[] }>(
    client,
    `${collection}?${filterQuery}${populate}&pagination[pageSize]=200`,
  );

  return response.data ?? [];
}

async function upsertProductDescription(
  client: StrapiClient,
  product: AiReadyCatalogueProduct,
  medusaProduct: MedusaProduct,
): Promise<"created" | "updated"> {
  const description = buildAiReadyProductDescription(product);
  const existing = await findStrapiEntry(client, "product-descriptions", [
    encodeFilter("medusa_product_id", medusaProduct.id),
  ]);
  const payload: { data: Record<string, unknown> } = {
    data: {
      medusa_product_id: medusaProduct.id,
      product_title: medusaProduct.title ?? product.title,
      product_handle: product.handle,
      rich_description: description.rich_description,
      features: description.features,
      specifications: description.specifications,
      seo_title: description.seo_title.slice(0, 70),
      seo_description: description.seo_description.slice(0, 160),
      meta_keywords: description.meta_keywords,
      last_synced: new Date().toISOString(),
      sync_status: "manual",
    },
  };

  if (existing?.documentId) {
    await strapiJson(client, `product-descriptions/${existing.documentId}?status=published`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    return "updated";
  }

  await strapiJson(client, "product-descriptions?status=published", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return "created";
}

async function upsertProductDocument(
  client: StrapiClient,
  product: AiReadyCatalogueProduct,
  medusaProduct: MedusaProduct,
  document: AiReadyProductDocumentSeed,
  logger: SeedLogger,
): Promise<"created" | "updated"> {
  const existing = await findStrapiEntry(
    client,
    "product-documents",
    [
      encodeFilter("medusa_product_id", medusaProduct.id),
      encodeFilter("title", document.title),
    ],
    "&populate[file]=true",
  );
  const payload: { data: Record<string, unknown> } = {
    data: {
      medusa_product_id: medusaProduct.id,
      product_title: medusaProduct.title ?? product.title,
      product_handle: product.handle,
      title: document.title,
      document_type: document.document_type,
      version: document.version,
      language: document.language,
      is_public: document.is_public,
      search_keywords: document.search_keywords,
      sort_order: document.sort_order,
      source_url: document.source_url,
      source_kind: document.source_kind,
      source_label: document.source_label,
      source_checked_at: toSourceCheckedAtDatetime(
        product.source.source_checked_at,
      ),
    },
  };

  if (existing?.documentId) {
    if (
      document.cache_file &&
      shouldReplaceAiReadyDocumentFile(existing, document)
    ) {
      const uploadedFile = await uploadSourceDocumentFile(
        client,
        document,
        logger,
      );
      payload.data.file = uploadedFile.id ?? null;
    } else if (!document.cache_file) {
      payload.data.file = null;
    }

    await strapiJson(
      client,
      `product-documents/${existing.documentId}?status=published`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );

    return "updated";
  }

  const uploadedFile = await uploadSourceDocumentFile(client, document, logger);

  await strapiJson(client, "product-documents?status=published", {
    method: "POST",
    body: JSON.stringify({
      data: {
        ...payload.data,
        ...(uploadedFile.id ? { file: uploadedFile.id } : {}),
      },
    }),
  });

  return "created";
}

async function retireLegacyProductDocuments(
  client: StrapiClient,
  medusaProduct: MedusaProduct,
  desiredDocuments: AiReadyProductDocumentSeed[],
): Promise<number> {
  if (!medusaProduct.id) {
    return 0;
  }

  const desiredTitles = new Set(
    desiredDocuments.map((document) => document.title),
  );
  const existingDocuments = await listStrapiEntries(
    client,
    "product-documents",
    [
      encodeFilter("medusa_product_id", medusaProduct.id),
      encodeFilter("is_public", "true"),
    ],
    "&populate[file]=true",
  );
  let retired = 0;

  for (const existing of existingDocuments) {
    if (!shouldRetireLegacyAiReadyDocument(existing, desiredTitles)) {
      continue;
    }

    await strapiJson(client, `product-documents/${existing.documentId}?status=published`, {
      method: "PUT",
      body: JSON.stringify({
        data: {
          is_public: false,
        },
      }),
    });
    retired += 1;
  }

  return retired;
}

async function getMedusaProductByHandle(
  productModuleService: IProductModuleService,
  handle: string,
): Promise<MedusaProduct | null> {
  const products = await productModuleService.listProducts(
    { handle },
    { select: ["id", "title", "handle"], take: 1 },
  );

  return products[0] ?? null;
}

export default async function seedAiReadyContent({
  container,
}: ExecArgs): Promise<SeedResult> {
  const logger = container.resolve(
    ContainerRegistrationKeys.LOGGER,
  ) as SeedLogger;
  const productModuleService: IProductModuleService = container.resolve(
    Modules.PRODUCT,
  );
  const client: StrapiClient = {
    apiUrl: getStrapiApiUrl(),
    token: getStrapiToken(),
  };
  const result: SeedResult = {
    descriptionsCreated: 0,
    descriptionsUpdated: 0,
    documentsCreated: 0,
    documentsUpdated: 0,
    documentsRetired: 0,
    productsProcessed: 0,
  };

  for (const product of AI_READY_CATALOGUE_PRODUCTS) {
    const medusaProduct = await getMedusaProductByHandle(
      productModuleService,
      product.handle,
    );

    if (!medusaProduct?.id) {
      logger.warn(`Skipping ${product.handle}: product not found in Medusa.`);
      continue;
    }

    const descriptionAction = await upsertProductDescription(
      client,
      product,
      medusaProduct,
    );
    if (descriptionAction === "created") result.descriptionsCreated += 1;
    else result.descriptionsUpdated += 1;

    const desiredDocuments = buildAiReadyProductDocuments(product);

    for (const document of desiredDocuments) {
      const documentAction = await upsertProductDocument(
        client,
        product,
        medusaProduct,
        document,
        logger,
      );

      if (documentAction === "created") result.documentsCreated += 1;
      else result.documentsUpdated += 1;
    }

    result.documentsRetired += await retireLegacyProductDocuments(
      client,
      medusaProduct,
      desiredDocuments,
    );

    result.productsProcessed += 1;
  }

  logger.info(
    `AI-ready content seed completed: products=${result.productsProcessed}, descriptions_created=${result.descriptionsCreated}, descriptions_updated=${result.descriptionsUpdated}, documents_created=${result.documentsCreated}, documents_updated=${result.documentsUpdated}, documents_retired=${result.documentsRetired}`,
  );

  return result;
}
