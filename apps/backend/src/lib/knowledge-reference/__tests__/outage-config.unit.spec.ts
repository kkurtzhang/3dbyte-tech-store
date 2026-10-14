import StrapiModuleService from "../../../modules/strapi/service";
import MeilisearchModuleService from "../../../modules/meilisearch/service";
import { reconcileReferenceIndex } from "../reference-index";
import { marked, now, approved, approvedKnowledgeDocument } from "./fixtures";
const original = process.env.APP_ENV;
const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
afterEach(() => {
  jest.restoreAllMocks();
  if (original === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = original;
});
it.each([500, 401, "timeout", "malformed"])(
  "does not erase the index on CMS %s",
  async (status) => {
    jest.spyOn(Date, "now").mockReturnValue(now);
    jest.spyOn(global, "fetch").mockImplementation(async () => {
      if (status === "timeout") throw new Error("timeout");
      return {
        ok: status === "malformed",
        status,
        json: async () => ({ data: {} }),
        text: async () => "private",
      } as Response;
    });
    const strapi = new StrapiModuleService({ logger } as never, {
      apiUrl: "https://cms.example",
      apiToken: "unused",
    });
    const p = marked();
    const meilisearch = {
      configureIndex: jest.fn(),
      indexData: jest.fn(),
      listDocumentIds: jest.fn().mockResolvedValue([p.id]),
      deleteFromIndex: jest.fn(),
    };
    await expect(
      reconcileReferenceIndex({
        strapi,
        query: { graph: async () => ({ data: [p], metadata: { count: 1 } }) },
        meilisearch: meilisearch as never,
        environment: "staging",
        productIds: [p.id],
        now,
      }),
    ).rejects.toThrow();
    expect(meilisearch.configureIndex).not.toHaveBeenCalled();
    expect(meilisearch.deleteFromIndex).not.toHaveBeenCalled();
    await expect(
      strapi.getKnowledgeReference(
        "doc_hotend",
        p.id,
        p.metadata.knowledge_reference.revision_hash,
      ),
    ).resolves.toBeNull();
  },
);
it("distinguishes authoritative absence from outage in strict reconciliation reads", async () => {
  jest.spyOn(global, "fetch").mockResolvedValue({
    ok: false,
    status: 404,
    text: async () => "not found",
  } as Response);
  const strapi = new StrapiModuleService({ logger } as never, {
    apiUrl: "https://cms.example",
    apiToken: "unused",
  });
  await expect(
    strapi.getKnowledgeReference("doc_hotend", "prod_hotend", "a".repeat(64), {
      failSoft: false,
    }),
  ).resolves.toBeNull();
});
it("keeps reference writes in a distinct staging-prefixed index and rejects production/foreign scope", async () => {
  process.env.APP_ENV = "staging";
  const create = (name?: string) =>
    new MeilisearchModuleService(
      { logger } as never,
      {
        host: "http://localhost:7700",
        apiKey: "unused",
        productIndexName: "stg_products",
        categoryIndexName: "stg_categories",
        brandIndexName: "stg_brands",
        addressIndexName: "addresses",
        localityIndexName: "localities",
        knowledgeReferenceIndexName: name,
        productDocumentIndexName: "stg_product_documents_public",
      } as never,
    );
  await expect(create().getIndexName("knowledge_reference")).resolves.toBe(
    "stg_knowledge_references",
  );
  await expect(
    create("prod_knowledge_references").getIndexName("knowledge_reference"),
  ).rejects.toThrow();
  await expect(
    create("stg_product_documents_public").getIndexName("knowledge_reference"),
  ).rejects.toThrow();
  process.env.APP_ENV = "production";
  await expect(create().getIndexName("knowledge_reference")).rejects.toThrow();
});

it("treats a valid but wrong revision response as unavailable during reconciliation", async () => {
  jest.spyOn(Date, "now").mockReturnValue(now);
  const document = approvedKnowledgeDocument(approved(), now)!;
  jest
    .spyOn(global, "fetch")
    .mockResolvedValue({
      ok: true,
      json: async () => ({ data: document }),
    } as Response);
  const strapi = new StrapiModuleService({ logger } as never, {
    apiUrl: "https://cms.example",
    apiToken: "unused",
  });
  await expect(
    strapi.getKnowledgeReference(
      document.document_id,
      document.product_id,
      "b".repeat(64),
      { failSoft: false },
    ),
  ).rejects.toThrow();
});
