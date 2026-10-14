import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { STRAPI_MODULE, type StrapiModuleService } from "../modules/strapi";
import {
  syncPublishedDocumentReview,
  type DocumentCapture,
} from "../lib/knowledge-reference/document-review-sync";
import type { ExecArgs } from "@medusajs/framework/types";

/** Explicit operator job; no webhook, native publication, approvals or index writes. */
export default async function ({ container }: ExecArgs) {
  if (!["staging", "test"].includes(process.env.APP_ENV || ""))
    throw new Error(
      "Document review synchronization is available for staging/test only.",
    );
  const definitionPath = process.env.DOCUMENT_REVIEW_CAPTURE_MANIFEST;
  const databasePath = process.env.DOCUMENT_REVIEW_DATABASE;
  const captureRoot = process.env.DOCUMENT_REVIEW_CAPTURE_ROOT;
  if (!definitionPath || !databasePath || !captureRoot)
    throw new Error(
      "An explicit capture manifest, local database and capture root are required.",
    );
  const file = await readFile(resolve(definitionPath));
  if (file.byteLength > 16 * 1024 * 1024)
    throw new Error("Oversized capture manifest.");
  const raw: unknown = JSON.parse(file.toString("utf8"));
  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    !("version" in raw) ||
    raw.version !== 1 ||
    !("scope_document_ids" in raw) ||
    !Array.isArray(raw.scope_document_ids) ||
    !("artifacts" in raw) ||
    !Array.isArray(raw.artifacts)
  )
    throw new Error("Invalid versioned capture manifest.");
  // Runtime validation in the adapter and Python boundary validates these fields.
  const result = await syncPublishedDocumentReview({
    strapi: container.resolve<StrapiModuleService>(STRAPI_MODULE),
    scopeDocumentIds: raw.scope_document_ids as string[],
    artifacts: raw.artifacts as DocumentCapture[],
    databasePath,
    captureRoot,
    medusaProductId: process.env.DOCUMENT_REVIEW_PRODUCT_ID,
  });
  container.resolve("logger").info(JSON.stringify(result));
}
