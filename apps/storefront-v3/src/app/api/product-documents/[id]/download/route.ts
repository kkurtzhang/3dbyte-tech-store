import { NextResponse } from "next/server";

import { resolveMedusaBaseUrl } from "@/lib/medusa/base-url";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const MIME_EXTENSION: Record<string, string> = {
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "application/json": ".json",
  "text/csv": ".csv",
};

function extensionForContentType(contentType: string | null): string {
  const mime = contentType?.split(";")[0]?.trim().toLowerCase();

  return mime ? MIME_EXTENSION[mime] ?? "" : "";
}

function hasFileExtension(filename: string): boolean {
  return /\.[a-z0-9]{2,8}$/i.test(filename);
}

function safeAttachmentFilename(
  id: string,
  contentType: string | null,
): string {
  const decoded = (() => {
    try {
      return decodeURIComponent(id);
    } catch {
      return id;
    }
  })();
  const filename = decoded
    .replace(/[\r\n"\\]/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const fallback = filename || "product-document";

  if (hasFileExtension(fallback)) {
    return fallback;
  }

  return `${fallback}${extensionForContentType(contentType)}`;
}

function proxiedDownloadHeaders(response: Response, id: string): Headers {
  const headers = new Headers();
  const passthroughHeaders = [
    "content-type",
    "content-length",
    "content-disposition",
    "last-modified",
    "etag",
  ];

  for (const header of passthroughHeaders) {
    const value = response.headers.get(header);
    if (value) {
      headers.set(header, value);
    }
  }

  if (!headers.has("content-type")) {
    headers.set("content-type", "application/octet-stream");
  }

  if (!headers.has("content-disposition")) {
    const contentType = headers.get("content-type");

    headers.set(
      "content-disposition",
      `attachment; filename="${safeAttachmentFilename(id, contentType)}"`,
    );
  }

  headers.set("cache-control", "private, no-store");
  headers.set("x-robots-tag", "noindex, nofollow");

  return headers;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return NextResponse.json(
      { error: "Download configuration is missing." },
      { status: 500 },
    );
  }

  const backendUrl = `${resolveMedusaBaseUrl({
    isServer: true,
  })}/store/product-documents/${encodeURIComponent(id)}/download`;

  const response = await fetch(backendUrl, {
    cache: "no-store",
    headers: {
      "x-publishable-api-key": publishableKey,
    },
    redirect: "follow",
  });

  if (response.status === 404) {
    return NextResponse.json(
      { error: "Product document was not found." },
      { status: 404 },
    );
  }

  if (response.ok && response.body) {
    return new Response(response.body, {
      status: 200,
      headers: proxiedDownloadHeaders(response, id),
    });
  }

  return NextResponse.json(
    { error: "Product document download is unavailable." },
    { status: response.ok ? 502 : response.status },
  );
}
