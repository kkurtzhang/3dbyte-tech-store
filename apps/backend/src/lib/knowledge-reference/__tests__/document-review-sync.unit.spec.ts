import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { transformSync } from "@swc/core";
import { normalizeStrapiProductDocument } from "../../../modules/product-files/utils/public-documents";
import { syncPublishedDocumentReview } from "../document-review-sync";

describe("native public document adapter to durable local review", () => {
  let directory: string;
  const url = "https://manufacturer.example/fixture";
  const time = "2026-10-10T01:00:00Z";
  const text = "Synthetic fixture only. Rated power: 73 W.";
  const sha = createHash("sha256").update(text).digest("hex");
  const raw = () => ({
    documentId: "fixture_doc",
    medusa_product_id: "fixture_product",
    title: "Synthetic source",
    product_title: "Synthetic product",
    product_handle: "synthetic-product",
    publishedAt: time,
    is_public: true,
    source_url: url,
    source_kind: "official_product_page",
    source_checked_at: time,
    version: "fixture-v1",
  });
  const artifact = () => ({
    document_id: "fixture_doc",
    path: "source.txt",
    sha256: sha,
    origin_url: url,
    mime: "text/plain" as const,
    source_provenance: {
      capture_kind: "original_response",
      capture_sha256: sha,
      response_sha256: sha,
      captured_at: time,
      final_url: url,
      derivation: "Synthetic source response fixture",
    },
  });

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "native-document-review-test-"));
    await writeFile(join(directory, "source.txt"), text);
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  function options(documents = [normalizeStrapiProductDocument(raw())]) {
    return {
      strapi: { listProductDocuments: jest.fn().mockResolvedValue(documents) },
      scopeDocumentIds: ["fixture_doc"],
      artifacts: [artifact()],
      databasePath: join(directory, "state.sqlite3"),
      captureRoot: directory,
      capturedAt: time,
    };
  }
  function inspect() {
    return JSON.parse(
      execFileSync(
        "python3",
        [
          "-B",
          "-c",
          "import json,sqlite3,sys;c=sqlite3.connect(sys.argv[1]);print(json.dumps([json.loads(r[0]) for r in c.execute('SELECT entry_json FROM documents ORDER BY document_id')]))",
          join(directory, "state.sqlite3"),
        ],
        { encoding: "utf8" },
      ),
    );
  }

  it("uses the actual normalized public DTO, persists chunks, and remains unapproved", async () => {
    const input = options();
    const before = structuredClone(input.artifacts);
    const result = await syncPublishedDocumentReview(input);
    expect(input.strapi.listProductDocuments).toHaveBeenCalledWith(undefined, {
      failSoft: false,
    });
    expect(result.prepared_documents).toBe(1);
    expect(result.native_applied).toBe(false);
    expect(inspect()[0]).toMatchObject({
      document_id: "fixture_doc",
      status: "prepared_requires_review",
      retrieval_eligible: false,
      native_approval_verified: false,
    });
    expect(inspect()[0].chunks[0].citation.source_sha256).toBe(sha);
    expect(input.artifacts).toEqual(before);
  });
  it("restarts a real Python/SQLite process and idempotently replays the same native snapshot", async () => {
    const input = options();
    const first = await syncPublishedDocumentReview(input);
    const next = await syncPublishedDocumentReview(input);
    expect(next.already_applied).toBe(true);
    expect(next.run_id).toBe(first.run_id);
  });

  it("executes the durable helper from a compiled Medusa server layout", async () => {
    const backend = resolve(__dirname, "../../../..");
    const isolated = join(directory, "operator-root");
    const compiledDirectory = join(
      isolated,
      ".medusa/server/src/lib/knowledge-reference",
    );
    await mkdir(compiledDirectory, { recursive: true });
    await symlink(
      join(backend, "node_modules"),
      join(isolated, "node_modules"),
      "dir",
    );
    await cp(
      join(backend, "scripts/document-review"),
      join(isolated, "scripts/document-review"),
      { recursive: true },
    );
    const source = await readFile(
      join(__dirname, "../document-review-sync.ts"),
      "utf8",
    );
    const compiled = transformSync(source, {
      jsc: { parser: { syntax: "typescript" }, target: "es2021" },
      module: { type: "commonjs" },
    }).code;
    const file = join(compiledDirectory, "document-review-sync.cjs");
    await writeFile(file, compiled);
    const nativeRequire = createRequire(join(isolated, "package.json"));
    const adapter = nativeRequire(file) as {
      syncPublishedDocumentReview: typeof syncPublishedDocumentReview;
    };
    expect(
      (await adapter.syncPublishedDocumentReview(options())).prepared_documents,
    ).toBe(1);
  });
  it("withdraws an unpublished scoped document but retains a different native document", async () => {
    const other = normalizeStrapiProductDocument({
      ...raw(),
      documentId: "fixture_other",
    });
    const initial = {
      ...options([normalizeStrapiProductDocument(raw()), other]),
      scopeDocumentIds: ["fixture_doc", "fixture_other"],
      artifacts: [artifact(), { ...artifact(), document_id: "fixture_other" }],
    };
    await syncPublishedDocumentReview(initial);
    await syncPublishedDocumentReview({
      ...options([]),
      capturedAt: "2026-10-10T02:00:00Z",
    });
    expect(inspect().map((e: { status: string }) => e.status)).toEqual([
      "withdrawn",
      "prepared_requires_review",
    ]);
  });
  it("creates a new durable revision when native published metadata changes", async () => {
    await syncPublishedDocumentReview(options());
    const before = inspect()[0];
    const changed = normalizeStrapiProductDocument({
      ...raw(),
      title: "Revised synthetic document",
      publishedAt: "2026-10-10T02:00:00Z",
    });
    const result = await syncPublishedDocumentReview({
      ...options([changed]),
      capturedAt: "2026-10-10T02:00:00Z",
    });
    expect(result.withdrawn_chunks).toBe(1);
    expect(inspect()[0].revision_sha256).not.toBe(before.revision_sha256);
  });
  it("aborts a failed CMS snapshot without withdrawing persisted documents", async () => {
    await syncPublishedDocumentReview(options());
    const before = inspect();
    const input = options();
    input.strapi.listProductDocuments.mockRejectedValue(
      new Error("CMS unavailable"),
    );
    await expect(syncPublishedDocumentReview(input)).rejects.toThrow(
      "CMS unavailable",
    );
    expect(inspect()).toEqual(before);
  });
  it("rejects duplicate, out-of-scope and oversized inputs before reading CMS", async () => {
    for (const patch of [
      { scopeDocumentIds: ["fixture_doc", "fixture_doc"] },
      { scopeDocumentIds: Array.from({ length: 101 }, (_, i) => "doc_" + i) },
      { artifacts: [artifact(), artifact()] },
      { artifacts: [{ ...artifact(), document_id: "outside" }] },
    ]) {
      const input = { ...options(), ...patch };
      await expect(syncPublishedDocumentReview(input)).rejects.toThrow();
      expect(input.strapi.listProductDocuments).not.toHaveBeenCalled();
    }
  });
  it("rejects an unpublished or mismatched native result and preserves local state", async () => {
    for (const patch of [
      { publishedAt: null },
      { medusa_product_id: "bad id" },
    ]) {
      const input = options([
        normalizeStrapiProductDocument({ ...raw(), ...patch }),
      ]);
      await expect(syncPublishedDocumentReview(input)).rejects.toThrow();
    }
  });
  it("source failure removes only that document's chunks and repairs on retry", async () => {
    await syncPublishedDocumentReview(options());
    const input = {
      ...options(),
      capturedAt: "2026-10-10T02:00:00Z",
      artifacts: [{ ...artifact(), path: "missing.txt" }],
    };
    const failed = await syncPublishedDocumentReview(input);
    expect(failed.failed_documents).toBe(1);
    expect(failed.withdrawn_chunks).toBe(1);
    await writeFile(join(directory, "missing.txt"), text);
    expect((await syncPublishedDocumentReview(input)).failed_documents).toBe(0);
  });
  it("does not copy private CMS fields or accept test approvals as customer eligibility", async () => {
    const normalized = normalizeStrapiProductDocument({
      ...raw(),
      knowledge_review: {
        status: "approved",
        reviewed_by: "synthetic-negative-test",
      },
      private_note: "PRIVATE_OMIT",
    });
    await syncPublishedDocumentReview(options([normalized]));
    expect(JSON.stringify(inspect())).not.toMatch(/PRIVATE_OMIT|reviewed_by/);
    expect(inspect()[0].retrieval_eligible).toBe(false);
  });
  it("refuses malformed clock/product filters and does not expose subprocess diagnostic bodies", async () => {
    await expect(
      syncPublishedDocumentReview({ ...options(), capturedAt: "yesterday" }),
    ).rejects.toThrow();
    await expect(
      syncPublishedDocumentReview({ ...options(), medusaProductId: "bad id" }),
    ).rejects.toThrow();
    await expect(
      syncPublishedDocumentReview({
        ...options(),
        pythonExecutable: "/missing-python",
      }),
    ).rejects.toThrow("Local document review synchronization failed");
    expect(await readFile(join(directory, "source.txt"), "utf8")).toBe(text);
  });
});
