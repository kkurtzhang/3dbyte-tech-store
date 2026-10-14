import { readPublicProductDocuments } from "../../../modules/strapi/public-product-documents";
import StrapiModuleService from "../../../modules/strapi/service";
import {
  approved,
  fixtureReviewEvent,
  approvedKnowledgeDocument,
  now,
} from "../../knowledge-reference/__tests__/fixtures";

const mockFindMany = jest.fn();
const mockReviewEvents = jest.fn();
function mockPersistedEvents(
  records: ReturnType<typeof approved>[],
  keys: string[],
) {
  const events = records
    .map(fixtureReviewEvent)
    .filter((event) => keys.includes(event.revision_key));
  return [
    ...new Map(events.map((event) => [event.revision_key, event])).values(),
  ];
}
const mockCoreFind = jest.fn();
jest.mock(
  "@strapi/strapi",
  () => ({
    factories: {
      createCoreController: (
        _uid: string,
        build: (value: unknown) => object,
      ) => {
        const result = build({
          strapi: {
            db: { query: () => ({ findMany: mockReviewEvents }) },
            documents: () => ({ findMany: mockFindMany }),
          },
        });
        Object.setPrototypeOf(result, { find: mockCoreFind });
        return result;
      },
    },
  }),
  { virtual: true },
);
const controller =
  require("../../../../../cms/src/api/product-document/controllers/product-document").default;
const native = () => approved();
const publicRecord = () => {
  const { knowledge_content, knowledge_review, ...rest } = native();
  return rest;
};
const page = (data: unknown[]) => ({
  data,
  meta: {
    pagination: {
      page: 1,
      pageSize: 200,
      pageCount: data.length ? 1 : 0,
      total: data.length,
    },
  },
});
const context = (query = {}) => ({
  query,
  set: jest.fn(),
  badRequest: jest.fn().mockReturnValue({ error: "invalid" }),
});
beforeEach(() => {
  jest.resetAllMocks();
  mockReviewEvents.mockImplementation(async ({ where }) =>
    mockPersistedEvents(
      (await mockFindMany.mock.results.at(-1)?.value) ?? [],
      where.revision_key.$in,
    ),
  );
  jest.spyOn(Date, "now").mockReturnValue(now);
});
afterEach(() => jest.restoreAllMocks());

describe("public CMS approved projection", () => {
  it("keeps default metadata reads unchanged without accessing private records", async () => {
    const result = page([publicRecord()]);
    mockCoreFind.mockResolvedValue(result);
    const ctx = context();
    expect(await controller.find(ctx)).toEqual(result);
    expect(mockFindMany).not.toHaveBeenCalled();
  });
  it("adds only the verified projection with an exact bounded published lookup", async () => {
    mockCoreFind.mockResolvedValue(page([publicRecord()]));
    mockFindMany.mockResolvedValue([native()]);
    const ctx = context({ knowledge: "approved" });
    const result = await controller.find(ctx);
    expect(result.data[0].approved_knowledge).toEqual(
      approvedKnowledgeDocument(native(), now),
    );
    expect(JSON.stringify(result)).not.toMatch(
      /knowledge_content|knowledge_review|reviewed_at/,
    );
    expect(ctx.query).not.toHaveProperty("knowledge");
    expect(ctx.set).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "published",
        limit: 2,
        filters: {
          documentId: { $in: [native().documentId] },
          is_public: { $eq: true },
        },
      }),
    );
  });
  it("withholds expired, ambiguous, changed and unpublished projections", async () => {
    for (const records of [
      [{ ...native(), publishedAt: null }],
      [native(), native()],
      [
        {
          ...native(),
          knowledge_content: { ...native().knowledge_content, text: "changed" },
        },
      ],
      [
        {
          ...native(),
          knowledge_review: {
            ...native().knowledge_review,
            valid_until: "2026-10-08T11:30:00Z",
          },
        },
      ],
    ]) {
      mockCoreFind.mockResolvedValue(page([publicRecord()]));
      mockFindMany.mockResolvedValue(records);
      expect(
        (await controller.find(context({ knowledge: "approved" }))).data[0],
      ).not.toHaveProperty("approved_knowledge");
    }
  });
  it("rejects unsupported projection options and oversized pages before private reads", async () => {
    const ctx = context({ knowledge: "raw" });
    await controller.find(ctx);
    expect(ctx.badRequest).toHaveBeenCalled();
    expect(mockFindMany).not.toHaveBeenCalled();
    mockCoreFind.mockResolvedValue(
      page(Array.from({ length: 201 }, publicRecord)),
    );
    await expect(
      controller.find(context({ knowledge: "approved" })),
    ).rejects.toThrow();
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});

it("never publishes raw approval JSON without its protected native event", async () => {
  mockCoreFind.mockResolvedValue(page([publicRecord()]));
  mockFindMany.mockResolvedValue([native()]);
  mockReviewEvents.mockResolvedValue([]);
  expect(
    (await controller.find(context({ knowledge: "approved" }))).data[0],
  ).not.toHaveProperty("approved_knowledge");
});

describe("approved document adapter", () => {
  it("requests the scoped projection, recomputes approval, and strips private extras", async () => {
    const data = {
      ...publicRecord(),
      approved_knowledge: approvedKnowledgeDocument(native(), now),
      knowledge_review: { secret: true },
    };
    const request = jest.fn().mockResolvedValue(page([data]));
    const result = await readPublicProductDocuments(request, undefined, {
      includeKnowledge: true,
      documentId: native().documentId,
    });
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining("knowledge=approved"),
    );
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining("filters[documentId][$eq]=doc_hotend"),
    );
    expect(result[0].approved_knowledge).toEqual(data.approved_knowledge);
    expect(result[0]).not.toHaveProperty("knowledge_review");
    expect((await readPublicProductDocuments(request))[0]).not.toHaveProperty(
      "approved_knowledge",
    );
    data.approved_knowledge = { ...data.approved_knowledge!, text: "tampered" };
    expect(
      (
        await readPublicProductDocuments(request, undefined, {
          includeKnowledge: true,
        })
      )[0],
    ).not.toHaveProperty("approved_knowledge");
  });
  it("fails closed before requesting an invalid scope or reconciling oversized knowledge snapshots", async () => {
    const request = jest.fn().mockResolvedValue({
      ...page([]),
      meta: {
        pagination: { page: 1, pageSize: 200, pageCount: 11, total: 2001 },
      },
    });
    await expect(
      readPublicProductDocuments(request, undefined, {
        includeKnowledge: true,
        documentId: 'bad"scope',
      }),
    ).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
    await expect(
      readPublicProductDocuments(request, undefined, {
        includeKnowledge: true,
      }),
    ).rejects.toThrow();
  });
  it("uses anonymous bounded no-store requests for approved content", async () => {
    const fetch = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, json: async () => page([]) } as Response);
    const service = new StrapiModuleService(
      { logger: { warn: jest.fn() } } as never,
      { apiUrl: "https://cms.example", apiToken: "unused" },
    );
    await service.listProductDocuments(undefined, { includeKnowledge: true });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("knowledge=approved"),
      expect.objectContaining({
        cache: "no-store",
        signal: expect.any(AbortSignal),
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
});
