import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import {
  STRAPI_MODULE,
  StrapiModuleService,
} from "../../../../../modules/strapi";

const MIME_EXTENSION: Record<string, string> = {
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "application/json": ".json",
  "text/csv": ".csv",
};

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/g, "");
}

function extensionForMimeType(mimeType?: string | null): string {
  const mime = mimeType?.split(";")[0]?.trim().toLowerCase();

  return mime ? MIME_EXTENSION[mime] ?? "" : "";
}

function hasFileExtension(filename: string): boolean {
  return /\.[a-z0-9]{2,8}$/i.test(filename);
}

function safeAttachmentFilename(
  preferredName: string | undefined,
  fallbackId: string,
  mimeType?: string | null,
): string {
  const rawName = preferredName?.trim() || fallbackId || "product-document";
  const safeName = rawName
    .replace(/[\r\n"\\]/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const filename = safeName || "product-document";

  if (hasFileExtension(filename)) {
    return filename;
  }

  return `${filename}${extensionForMimeType(mimeType)}`;
}

function resolveDocumentFileUrl(fileUrl: string): string {
  const trimmedUrl = fileUrl.trim();
  const publicBaseUrl = process.env.S3_FILE_URL?.trim();
  const s3Endpoint = process.env.S3_ENDPOINT?.trim();
  const s3Bucket = process.env.S3_BUCKET?.trim();

  if (!trimmedUrl) {
    return trimmedUrl;
  }

  if (trimmedUrl.startsWith("/")) {
    const strapiBaseUrl = trimTrailingSlash(
      process.env.STRAPI_API_URL || process.env.STRAPI_URL || "",
    );

    return strapiBaseUrl ? `${strapiBaseUrl}${trimmedUrl}` : trimmedUrl;
  }

  if (!publicBaseUrl || !s3Endpoint) {
    return trimmedUrl;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    const parsedEndpoint = new URL(s3Endpoint);

    if (parsedUrl.origin !== parsedEndpoint.origin) {
      return trimmedUrl;
    }

    const rawPath = trimSlashes(parsedUrl.pathname);
    const bucketPrefix = s3Bucket ? `${trimSlashes(s3Bucket)}/` : "";
    const publicPath =
      bucketPrefix && rawPath.startsWith(bucketPrefix)
        ? rawPath.slice(bucketPrefix.length)
        : rawPath;

    return `${trimTrailingSlash(publicBaseUrl)}/${publicPath}`;
  } catch {
    return trimmedUrl;
  }
}

function originFrom(value?: string): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isAllowedDocumentFileUrl(fileUrl: string): boolean {
  const allowedOrigins = new Set(
    [
      originFrom(process.env.S3_FILE_URL),
      originFrom(process.env.STRAPI_API_URL),
      originFrom(process.env.STRAPI_URL),
    ].filter((origin): origin is string => Boolean(origin)),
  );

  const fileOrigin = originFrom(fileUrl);

  return allowedOrigins.size > 0 && fileOrigin
    ? allowedOrigins.has(fileOrigin)
    : false;
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

function isAllowedExternalSourceUrl(sourceUrl: string): boolean {
  try {
    const url = new URL(sourceUrl);

    return url.protocol === "https:" && !isBlockedSourceHost(url.hostname);
  } catch {
    return false;
  }
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const strapiService: StrapiModuleService = req.scope.resolve(STRAPI_MODULE);
  const document = await strapiService.getProductDocument(req.params.id as string);

  if (!document?.file_url && !document?.source_url) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Product document was not found",
    );
  }

  if (!document.file_url && document.source_url) {
    if (!isAllowedExternalSourceUrl(document.source_url)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Product document source URL is not allowed",
      );
    }

    res.redirect(302, document.source_url);
    return;
  }

  const downloadUrl = resolveDocumentFileUrl(document.file_url);

  if (!isAllowedDocumentFileUrl(downloadUrl)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Product document download URL is not allowed",
    );
  }

  const upstream = await fetch(downloadUrl, {
    redirect: "follow",
  });

  if (!upstream.ok) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Product document download is unavailable",
    );
  }

  const contentType =
    document.mime_type ||
    upstream.headers.get("content-type") ||
    "application/octet-stream";
  const body = Buffer.from(await upstream.arrayBuffer());

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Length", String(body.byteLength));
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeAttachmentFilename(
      document.file_name,
      document.id || (req.params.id as string),
      contentType,
    )}"`,
  );
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.status(200).send(body);
}
