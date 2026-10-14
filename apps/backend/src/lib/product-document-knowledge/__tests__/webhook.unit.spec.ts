jest.mock("../../../workflows/meilisearch", () => ({
  syncProductsWorkflow: jest.fn(),
}));
jest.mock(
  "../../../workflows/meilisearch/brands/index-rich-brand-workflow",
  () => ({ indexRichBrandWorkflow: jest.fn() }),
);
jest.mock(
  "../../../workflows/meilisearch/brands/index-basic-brand-workflow",
  () => ({ indexBasicBrandWorkflow: jest.fn() }),
);
jest.mock(
  "../../../workflows/meilisearch/brands/delete-brand-workflow",
  () => ({ deleteBrandWorkflow: jest.fn() }),
);
jest.mock("../../../links/product-brand", () => ({
  __esModule: true,
  default: { entryPoint: "product_brand" },
}));
import { POST } from "../../../api/webhooks/strapi/route";

const before = {
  secret: process.env.STRAPI_WEBHOOK_SECRET,
  enabled: process.env.PRODUCT_DOCUMENT_SYNC_ENABLED,
};
beforeEach(() => {
  process.env.STRAPI_WEBHOOK_SECRET = "test-webhook";
  process.env.PRODUCT_DOCUMENT_SYNC_ENABLED = "true";
});
afterEach(() => {
  for (const [key, value] of Object.entries({
    STRAPI_WEBHOOK_SECRET: before.secret,
    PRODUCT_DOCUMENT_SYNC_ENABLED: before.enabled,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
function setup() {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const strapi = { listProductDocuments: jest.fn().mockResolvedValue([]) };
  const meilisearch = { configureIndex: jest.fn(), deleteFromIndex: jest.fn() };
  const services: Record<string, unknown> = {
    logger,
    strapi,
    meilisearch,
    query: { graph: jest.fn() },
  };
  const req = {
    headers: { "x-webhook-secret": "test-webhook" },
    body: {
      model: "product-document",
      event: "entry.unpublish",
      entry: {
        documentId: "doc_withdrawn",
        knowledge_content: { text: "Never trust webhook text" },
      },
    },
    scope: { resolve: jest.fn((key: string) => services[key]) },
  };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res, strapi, meilisearch };
}
it("authenticates before any document read or derived write", async () => {
  const env = setup();
  env.req.headers["x-webhook-secret"] = "wrong";
  await POST(env.req as never, env.res as never);
  expect(env.res.status).toHaveBeenCalledWith(401);
  expect(env.strapi.listProductDocuments).not.toHaveBeenCalled();
  expect(env.meilisearch.configureIndex).not.toHaveBeenCalled();
});
it("withdraws only the current missing document and never trusts the webhook body", async () => {
  const env = setup();
  await POST(env.req as never, env.res as never);
  expect(env.strapi.listProductDocuments).toHaveBeenCalledWith(undefined, {
    includeKnowledge: true,
    documentId: "doc_withdrawn",
  });
  expect(env.meilisearch.deleteFromIndex).toHaveBeenCalledWith(
    ["doc_withdrawn"],
    "product_document",
  );
  expect(env.res.json).toHaveBeenCalledWith(
    expect.objectContaining({ received: true, deleted: 1 }),
  );
});
it("leaves the index untouched on upstream failure and returns retryable generic failure", async () => {
  const env = setup();
  env.strapi.listProductDocuments.mockRejectedValue(
    new Error("private CMS payload"),
  );
  await POST(env.req as never, env.res as never);
  expect(env.res.status).toHaveBeenCalledWith(503);
  expect(env.meilisearch.configureIndex).not.toHaveBeenCalled();
  expect(JSON.stringify(env.res.json.mock.calls)).not.toContain(
    "private CMS payload",
  );
});
it("validates identity and stays inert while disabled", async () => {
  const env = setup();
  env.req.body.entry.documentId = 'bad"id';
  await POST(env.req as never, env.res as never);
  expect(env.res.status).toHaveBeenCalledWith(400);
  expect(env.strapi.listProductDocuments).not.toHaveBeenCalled();
  delete process.env.PRODUCT_DOCUMENT_SYNC_ENABLED;
  await POST(env.req as never, env.res as never);
  expect(env.res.json).toHaveBeenCalledWith({ received: true, skipped: true });
  expect(env.strapi.listProductDocuments).not.toHaveBeenCalled();
});
