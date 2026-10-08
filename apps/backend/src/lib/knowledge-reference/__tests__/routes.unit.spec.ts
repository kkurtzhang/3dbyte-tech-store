import { GET } from "../../../api/store/knowledge-references/route";
import { GET as preview } from "../../../api/admin/products/[id]/knowledge-reference-preview/route";
import StrapiModuleService from "../../../modules/strapi/service";
import {
  now,
  approved,
  marked,
  product,
  approvedKnowledgeDocument,
} from "./fixtures";

const mockFindMany = jest.fn();
jest.mock(
  "@strapi/strapi",
  () => ({
    factories: {
      createCoreController: (
        _uid: string,
        build: (value: unknown) => unknown,
      ) =>
        build({
          strapi: {
            documents: () => ({
              findMany: (...args: unknown[]) => mockFindMany(...args),
            }),
          },
        }),
    },
  }),
  { virtual: true },
);
const controller =
  require("../../../../../cms/src/api/product-document/controllers/product-document")
    .default as { knowledgeReference: (ctx: unknown) => Promise<unknown> };
const originalEnv = process.env.APP_ENV;
const response = () => ({
  setHeader: jest.fn(),
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});
const graph = jest.fn(),
  getKnowledgeReference = jest.fn();
const request = (query = {}) => ({
  query,
  scope: {
    resolve: (key: string) =>
      key === "query" ? { graph } : { getKnowledgeReference },
  },
});

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(Date, "now").mockReturnValue(now);
  process.env.APP_ENV = "staging";
});
afterEach(() => {
  jest.restoreAllMocks();
  if (originalEnv === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = originalEnv;
});

describe("current native reference reads", () => {
  it("prepares an exact read-only native binding preview with unset prices", async () => {
    graph.mockResolvedValue({ data: [product()] });
    const doc = approvedKnowledgeDocument(approved(), now)!;
    getKnowledgeReference.mockResolvedValue(doc);
    const req = {
      ...request({ document_id: doc.document_id, revision: doc.revision_hash }),
      params: { id: doc.product_id },
    };
    const res = response();
    await preview(req as never, res as never);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        applied: false,
        prices: [],
        checkout_enabled: false,
        native_update: expect.objectContaining({
          status: "draft",
          metadata: expect.objectContaining({
            catalogue_role: "knowledge_reference",
          }),
        }),
      }),
    );
    graph.mockResolvedValue({ data: [{ ...product(), status: "published" }] });
    await preview(req as never, res as never);
    expect(res.status).toHaveBeenCalledWith(409);
  });
  it("CMS reads only exact published/public identities and emits no private review fields", async () => {
    const native = approved();
    mockFindMany.mockResolvedValue([native]);
    const ctx = {
      params: { documentId: native.documentId },
      query: {
        medusa_product_id: native.medusa_product_id,
        revision: native.knowledge_review.revision_hash,
      },
      set: jest.fn(),
      notFound: jest.fn(),
      badRequest: jest.fn(),
    };
    const result = await controller.knowledgeReference(ctx as never);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "published",
        limit: 2,
        filters: {
          documentId: { $eq: native.documentId },
          medusa_product_id: { $eq: native.medusa_product_id },
          is_public: { $eq: true },
        },
      }),
    );
    expect(result).toEqual({ data: approvedKnowledgeDocument(native, now) });
    expect(JSON.stringify(result)).not.toMatch(
      /knowledge_review|knowledge_content|reviewed_at/,
    );
    expect(ctx.set).toHaveBeenCalledWith("Cache-Control", "no-store");
    native.knowledge_content.text += "Changed";
    await controller.knowledgeReference(ctx as never);
    expect(ctx.notFound).toHaveBeenCalled();
    mockFindMany.mockResolvedValue([approved(), approved()]);
    expect(await controller.knowledgeReference(ctx as never)).toBeUndefined();
    ctx.query = { ...ctx.query, populate: "*" } as never;
    await controller.knowledgeReference(ctx as never);
    expect(ctx.badRequest).toHaveBeenCalled();
  });
  it("revalidates the exact CMS revision, skips ordinary drafts, and never reads an index", async () => {
    graph.mockResolvedValue({
      data: [{ id: "prod_private", status: "draft", metadata: {} }, marked()],
    });
    getKnowledgeReference.mockResolvedValue(
      approvedKnowledgeDocument(approved(), now),
    );
    const res = response();
    await GET(request() as never, res as never);
    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { status: "draft" },
        fields: expect.arrayContaining(["variants.price_set.prices.amount"]),
        pagination: { take: 50, skip: 0, order: { id: "ASC" } },
      }),
    );
    expect(getKnowledgeReference).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        references: [
          expect.objectContaining({ price: null, checkout_enabled: false }),
        ],
        next_offset: null,
      }),
    );
    getKnowledgeReference.mockResolvedValue(null);
    await GET(request() as never, res as never);
    expect(res.json).toHaveBeenLastCalledWith({
      references: [],
      next_offset: null,
    });
  });
  it("caps each public request at four CMS lookups and preserves pagination", async () => {
    graph.mockResolvedValue({
      data: Array.from({ length: 50 }, () => marked()),
    });
    getKnowledgeReference.mockResolvedValue(null);
    const res = response();
    await GET(request({ offset: "50" }) as never, res as never);
    expect(getKnowledgeReference).toHaveBeenCalledTimes(4);
    expect(res.json).toHaveBeenCalledWith({ references: [], next_offset: 54 });
  });
  it("hides the endpoint outside staging and rejects unbounded input before any source read", async () => {
    const res = response();
    process.env.APP_ENV = "production";
    await GET(request() as never, res as never);
    expect(res.status).toHaveBeenCalledWith(404);
    process.env.APP_ENV = "staging";
    await GET(request({ offset: "9000" }) as never, res as never);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(graph).not.toHaveBeenCalled();
  });
  it("fails safely on native catalogue failure", async () => {
    graph.mockRejectedValue(new Error("private details"));
    const res = response();
    await GET(request() as never, res as never);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain(
      "private details",
    );
  });
  it("Strapi adapter uses anonymous no-store reads and rejects altered or missing revisions", async () => {
    const fetch = jest.spyOn(global, "fetch");
    const doc = approvedKnowledgeDocument(approved(), now)!;
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: doc }),
    } as Response);
    const logger = { warn: jest.fn(), error: jest.fn() };
    const service = new StrapiModuleService({ logger } as never, {
      apiUrl: "https://cms.example",
      apiToken: "unused-fixture",
    });
    await expect(
      service.getKnowledgeReference(
        doc.document_id,
        doc.product_id,
        doc.revision_hash,
      ),
    ).resolves.toEqual(doc);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        `/knowledge-reference?medusa_product_id=${doc.product_id}&revision=${doc.revision_hash}`,
      ),
      expect.objectContaining({
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      }),
    );
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ...doc, revision_hash: "b".repeat(64) } }),
    } as Response);
    await expect(
      service.getKnowledgeReference(
        doc.document_id,
        doc.product_id,
        doc.revision_hash,
      ),
    ).resolves.toBeNull();
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { ...doc, product_title: "Tampered snapshot" },
      }),
    } as Response);
    await expect(
      service.getKnowledgeReference(
        doc.document_id,
        doc.product_id,
        doc.revision_hash,
      ),
    ).resolves.toBeNull();
    fetch.mockRejectedValue(new Error("private details"));
    await expect(
      service.getKnowledgeReference(
        doc.document_id,
        doc.product_id,
        doc.revision_hash,
      ),
    ).resolves.toBeNull();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
