import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import {
  knowledgeDigest,
  knowledgeIdentifier,
} from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
import type StrapiModuleService from "../../modules/strapi/service";
import type { PublicProductDocument } from "../../modules/product-files/utils/public-documents";

export interface DocumentCapture {
  document_id: string;
  path: string;
  sha256: string;
  origin_url: string;
  mime: "text/plain" | "application/pdf";
  source_provenance?: Record<string, unknown>;
}
export interface DocumentReviewOptions {
  strapi: Pick<StrapiModuleService, "listProductDocuments">;
  scopeDocumentIds: string[];
  artifacts: DocumentCapture[];
  captureRoot: string;
  databasePath: string;
  medusaProductId?: string;
  capturedAt?: string;
  pythonExecutable?: string;
}
export interface DocumentReviewResult {
  run_id: string;
  already_applied: boolean;
  prepared_documents: number;
  failed_documents: number;
  withdrawn_documents: number;
  added_chunks: number;
  withdrawn_chunks: number;
  review_only: true;
  native_applied: false;
  retrieval_eligible: false;
  native_approval_verified: false;
}

const execute = promisify(execFile);
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function https(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    value.length > 2048
  )
    throw new Error("A public HTTPS capture binding is required.");
  return value;
}
function clock(value: string) {
  if (
    !/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error("A timestamp with an offset is required.");
  return value;
}
function validate(options: DocumentReviewOptions) {
  const scope = options.scopeDocumentIds;
  if (
    !Array.isArray(scope) ||
    scope.length < 1 ||
    scope.length > 100 ||
    scope.some((id) => !knowledgeIdentifier(id)) ||
    new Set(scope).size !== scope.length ||
    (options.medusaProductId !== undefined &&
      !knowledgeIdentifier(options.medusaProductId))
  )
    throw new Error(
      "An exact bounded document scope and product filter are required.",
    );
  const artifacts = options.artifacts;
  if (!Array.isArray(artifacts) || artifacts.length > scope.length)
    throw new Error("Invalid bounded capture manifest.");
  const ids = new Set<string>();
  for (const artifact of artifacts) {
    if (
      !record(artifact) ||
      !scope.includes(artifact.document_id) ||
      ids.has(artifact.document_id) ||
      !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,145}\.(pdf|txt)$/.test(artifact.path) ||
      !knowledgeDigest(artifact.sha256) ||
      !["text/plain", "application/pdf"].includes(artifact.mime) ||
      (artifact.source_provenance !== undefined &&
        !record(artifact.source_provenance))
    )
      throw new Error(
        "Capture bindings must be unique, scoped and hash verified.",
      );
    https(artifact.origin_url);
    ids.add(artifact.document_id);
  }
  if (options.capturedAt !== undefined) clock(options.capturedAt);
}
function nativeDocument(
  document: PublicProductDocument,
  artifact?: DocumentCapture,
) {
  if (
    !knowledgeIdentifier(document.id) ||
    !knowledgeIdentifier(document.medusa_product_id) ||
    !document.published_at
  )
    throw new Error(
      "The published CMS adapter returned an invalid identity or publication.",
    );
  clock(document.published_at);
  const asset = https(document.file_url || document.source_url || "");
  return {
    documentId: document.id,
    medusa_product_id: document.medusa_product_id,
    product_handle: document.product_handle,
    product_title: document.product_title,
    title: document.title,
    version: document.version,
    language: document.language,
    source_kind: document.source_kind,
    source_url: document.source_url ? https(document.source_url) : asset,
    source_checked_at: document.source_checked_at,
    publishedAt: document.published_at,
    is_public: true,
    file: {
      url: asset,
      mime: document.file_url ? document.mime_type : artifact?.mime,
    },
  };
}

/** Manual native adapter integration. It writes local review state only. */
export async function syncPublishedDocumentReview(
  options: DocumentReviewOptions,
): Promise<DocumentReviewResult> {
  validate(options);
  // The native adapter throws on incomplete/changing pagination; never fail soft here.
  const published = await options.strapi.listProductDocuments(
    options.medusaProductId,
    { failSoft: false },
  );
  const artifacts = new Map(options.artifacts.map((a) => [a.document_id, a]));
  const selected = published.filter((d) =>
    options.scopeDocumentIds.includes(d.id),
  );
  if (new Set(selected.map((d) => d.id)).size !== selected.length)
    throw new Error("Repeated identity in native document snapshot.");
  const manifest = {
    version: 1,
    snapshot_complete: true,
    captured_at: clock(options.capturedAt || new Date().toISOString()),
    scope_document_ids: [...options.scopeDocumentIds],
    documents: selected.map((d) => nativeDocument(d, artifacts.get(d.id))),
    artifacts: selected.flatMap((d) => {
      const a = artifacts.get(d.id);
      return a
        ? [
            {
              document_id: a.document_id,
              path: a.path,
              sha256: a.sha256,
              origin_url: a.origin_url,
              mime: a.mime,
              source_provenance: a.source_provenance,
            },
          ]
        : [];
    }),
  };
  const directory = await mkdtemp(join(tmpdir(), "3dbyte-document-review-"));
  try {
    const path = join(directory, "manifest.json");
    await writeFile(path, JSON.stringify(manifest), { mode: 0o600 });
    const { stdout } = await execute(
      options.pythonExecutable || "python3",
      [
        "-B",
        resolve(__dirname, "../../../scripts/document-review/bridge.py"),
        resolve(options.databasePath),
        resolve(options.captureRoot),
        path,
      ],
      { timeout: 60000, maxBuffer: 1_000_000 },
    );
    const result: unknown = JSON.parse(stdout);
    if (
      !record(result) ||
      result.review_only !== true ||
      result.native_applied !== false ||
      result.retrieval_eligible !== false ||
      result.native_approval_verified !== false ||
      typeof result.run_id !== "string" ||
      typeof result.prepared_documents !== "number"
    )
      throw new Error("Unexpected local review result.");
    return result as unknown as DocumentReviewResult;
  } catch {
    throw new Error(
      "Local document review synchronization failed; native content remains unchanged.",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
