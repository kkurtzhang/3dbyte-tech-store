import { POST } from "../../../api/ai/knowledge-search/route";
import { POST as sync } from "../../../api/admin/meilisearch/sync-product-documents/route";
import job, { config } from "../../../jobs/sync-product-documents";
import { handleProductDocumentWebhook } from "../lifecycle";
import {
  approved,
  approvedKnowledgeDocument,
  product,
  now,
} from "../../knowledge-reference/__tests__/fixtures";
import { normalizeStrapiProductDocument } from "../../../modules/product-files/utils/public-documents";

const original = {
  token: process.env.INTERNAL_API_TOKEN,
  enabled: process.env.PRODUCT_DOCUMENT_SYNC_ENABLED,
};
const res = () => ({
  setHeader: jest.fn(),
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});
function setup(
  body: unknown = { query: "Printer One" },
  token = "test-internal",
) {
  const doc = approvedKnowledgeDocument(approved(), now)!;
  const strapi = {
    listProductDocuments: jest
      .fn()
      .mockResolvedValue([
        {
          ...normalizeStrapiProductDocument(approved()),
          approved_knowledge: doc,
        },
      ]),
    getKnowledgeReference: jest.fn().mockResolvedValue(doc),
  };
  const query = {
    graph: jest
      .fn()
      .mockResolvedValue({
        data: [{ ...product(), status: "published" }],
        metadata: { count: 1 },
      }),
  };
  const meilisearch = {
    configureIndex: jest.fn(),
    indexData: jest.fn(),
    listDocumentIds: jest.fn().mockResolvedValue([doc.document_id]),
    deleteFromIndex: jest.fn(),
    search: jest
      .fn()
      .mockResolvedValue({
        hits: [
          {
            id: doc.document_id,
            medusa_product_id: doc.product_id,
            knowledge_variant_id: doc.variant_id,
            knowledge_revision_hash: doc.revision_hash,
          },
        ],
      }),
  };
  const logger = { info: jest.fn(), error: jest.fn() };
  const services: Record<string, unknown> = {
    strapi,
    query,
    meilisearch,
    logger,
  };
  const scope = { resolve: jest.fn((key: string) => services[key]) };
  return {
    doc,
    strapi,
    query,
    meilisearch,
    scope,
    req: { body, headers: { "x-3db-internal-token": token }, scope },
  };
}
beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(now);
  process.env.INTERNAL_API_TOKEN = "test-internal";
  delete process.env.PRODUCT_DOCUMENT_SYNC_ENABLED;
});
afterEach(() => {
  jest.restoreAllMocks();
  for (const [key, value] of Object.entries({
    INTERNAL_API_TOKEN: original.token,
    PRODUCT_DOCUMENT_SYNC_ENABLED: original.enabled,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

it("authenticates and validates before resolving knowledge services", async () => {
  const env = setup({ query: "Printer" }, "bad");
  const response = res();
  await POST(env.req as never, response as never);
  expect(response.status).toHaveBeenCalledWith(401);
  expect(env.scope.resolve).not.toHaveBeenCalled();
  for (const body of [
    { query: "x".repeat(121) },
    { query: "ok", limit: 5 },
    { query: "ok", product_id: 'bad"id' },
    { query: "ok", raw: true },
    null,
  ]) {
    const invalid = setup(body);
    const response = res();
    await POST(invalid.req as never, response as never);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(invalid.scope.resolve).not.toHaveBeenCalled();
  }
});
it("returns bounded current evidence and citations without caching or leaking native failures", async () => {
  const env = setup();
  const response = res();
  await POST(env.req as never, response as never);
  expect(response.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
  expect(response.json).toHaveBeenCalledWith(
    expect.objectContaining({
      documents: [env.doc],
      citations: [
        expect.objectContaining({ revision_hash: env.doc.revision_hash }),
      ],
    }),
  );
  env.query.graph.mockRejectedValue(new Error("secret db details"));
  await POST(env.req as never, response as never);
  expect(response.status).toHaveBeenCalledWith(503);
  expect(JSON.stringify(response.json.mock.calls)).not.toContain(
    "secret db details",
  );
});
it("manual sync uses the same approved projection on the existing public index", async () => {
  const env = setup();
  const response = res();
  await sync(env.req as never, response as never);
  expect(env.strapi.listProductDocuments).toHaveBeenCalledWith(undefined, {
    includeKnowledge: true,
  });
  expect(env.meilisearch.indexData).toHaveBeenCalledWith(
    [expect.objectContaining({ knowledge_text: env.doc.text })],
    "product_document",
  );
  expect(response.json).toHaveBeenCalledWith(
    expect.objectContaining({ indexed: 1, knowledge_indexed: 1 }),
  );
});
it("scheduled reconciliation is inert by default and repairs expiry and missed events when opted in", async () => {
  const env = setup();
  await job(env.scope as never);
  expect(env.scope.resolve).not.toHaveBeenCalled();
  process.env.PRODUCT_DOCUMENT_SYNC_ENABLED = "true";
  await job(env.scope as never);
  expect(env.meilisearch.indexData).toHaveBeenCalled();
  env.strapi.listProductDocuments.mockResolvedValue([]);
  await job(env.scope as never);
  expect(env.meilisearch.deleteFromIndex).toHaveBeenCalledWith(
    [env.doc.document_id],
    "product_document",
  );
  expect(config.schedule).toBe("*/5 * * * *");
});
it("webhook handling re-reads current native state, ignores raw payload content, and retries failures", async () => {
  const env = setup();
  expect(
    await handleProductDocumentWebhook(
      env.scope as never,
      "entry.publish",
      env.doc.document_id,
    ),
  ).toEqual({ skipped: true });
  expect(env.scope.resolve).not.toHaveBeenCalled();
  process.env.PRODUCT_DOCUMENT_SYNC_ENABLED = "true";
  for (const event of [
    "entry.publish",
    "entry.unpublish",
    "entry.delete",
    "entry.update",
  ]) {
    await handleProductDocumentWebhook(
      env.scope as never,
      event,
      env.doc.document_id,
    );
    expect(env.strapi.listProductDocuments).toHaveBeenLastCalledWith(
      undefined,
      { includeKnowledge: true, documentId: env.doc.document_id },
    );
  }
  const calls = env.strapi.listProductDocuments.mock.calls.length;
  await expect(
    handleProductDocumentWebhook(env.scope as never, "entry.publish", 'bad"id'),
  ).rejects.toThrow();
  expect(
    await handleProductDocumentWebhook(
      env.scope as never,
      "entry.create",
      env.doc.document_id,
    ),
  ).toEqual({ skipped: true });
  expect(env.strapi.listProductDocuments).toHaveBeenCalledTimes(calls);
  env.strapi.listProductDocuments.mockRejectedValue(new Error("retry"));
  await expect(
    handleProductDocumentWebhook(
      env.scope as never,
      "entry.publish",
      env.doc.document_id,
    ),
  ).rejects.toThrow("retry");
});
