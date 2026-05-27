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

type SeedLogger = {
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

function escapePdfText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "-")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
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

export function shouldReplaceAiReadyDocumentFile(
  existing: unknown,
  document: Pick<AiReadyProductDocumentSeed, "filename">,
): boolean {
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
  const file = getEntryFile(existing);
  const fileName = asString(file.name) || "";
  const mime = asString(file.mime)?.toLowerCase();

  return (
    Boolean(asString(entry.documentId)) &&
    asBoolean(entry.is_public) &&
    Boolean(title) &&
    !desiredTitles.has(title as string) &&
    (mime === "text/plain" || !hasFileExtension(fileName))
  );
}

function wrapText(value: string, maxLength = 86): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);

  return lines;
}

function createPdfBody(title: string, lines: string[]): string {
  const textLines = [title, "", ...lines].flatMap((line) =>
    line ? wrapText(line) : [""],
  );
  const content = [
    "BT",
    "/F1 16 Tf",
    "50 750 Td",
    `(${escapePdfText(textLines[0] ?? title)}) Tj`,
    "0 -26 Td",
    "/F1 10 Tf",
    ...textLines.slice(1, 47).map((line) => `(${escapePdfText(line)}) Tj T*`),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
  ];
  const offsets: number[] = [];
  let pdf = "%PDF-1.4\n";

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return pdf;
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

async function uploadPdf(
  client: StrapiClient,
  document: AiReadyProductDocumentSeed,
): Promise<StrapiUploadFile> {
  const formData = new FormData();
  const pdfBody = createPdfBody(document.pdfTitle, document.pdfLines);
  const blob = new Blob([pdfBody], { type: "application/pdf" });
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
    },
  };

  if (existing?.documentId) {
    if (shouldReplaceAiReadyDocumentFile(existing, document)) {
      const uploadedFile = await uploadPdf(client, document);
      payload.data.file = uploadedFile.id;
    }

    await strapiJson(client, `product-documents/${existing.documentId}?status=published`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    return "updated";
  }

  const uploadedFile = await uploadPdf(client, document);

  await strapiJson(client, "product-documents?status=published", {
    method: "POST",
    body: JSON.stringify({
      data: {
        ...payload.data,
        file: uploadedFile.id,
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
