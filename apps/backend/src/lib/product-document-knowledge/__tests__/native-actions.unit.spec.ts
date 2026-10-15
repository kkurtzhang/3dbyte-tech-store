import {
  approved,
  knowledgeRevision,
  now,
} from "../../knowledge-reference/__tests__/fixtures";
const {
  upsertNativeDocument,
  reviewNativeDocument,
  loadReviewEvents,
  previewNativeReview,
} = require("../../../../../cms/src/api/product-document/utils/native-actions");
const {
  assertReviewCreate,
  immutableReviewMutation,
} = require("../../../../../cms/src/api/product-document-review/utils/write-guard");
const {
  approvedKnowledgeDocument: nativeProjection,
} = require("../../../../../cms/src/api/product-document/utils/knowledge-reference");

const auth = () => ({
  isAuthenticated: true,
  auth: {
    strategy: { name: "content-api-token" },
    credentials: { id: 41, type: "full-access", name: "agent-editorial" },
  },
});
const intake = () => ({
  medusa_product_id: "prod_hotend",
  product_title: "2024 Hotend",
  product_handle: "hotend-2024",
  title: "Manufacturer reference",
  document_type: "other",
  source_url: "https://manufacturer.example/hotend",
  source_kind: "official_product_page",
  source_label: "Official",
  source_checked_at: "2026-10-08T10:00:00Z",
  search_keywords: [],
  is_public: false,
});
const review = () => ({
  revision_hash: knowledgeRevision(approved()),
  status: "published",
  decision: "approved",
  valid_until: "2026-10-20T00:00:00Z",
  evidence_policy: "official_or_two_independent",
  review_note: "Reviewed exact variant and source evidence.",
});
function setup() {
  const documents: Record<string, unknown>[] = [];
  const decisions: Record<string, unknown>[] = [];
  let tail = Promise.resolve();
  const sql: string[] = [];
  const documentApi = {
    findMany: jest.fn(async (input: any) =>
      documents.filter((d) =>
        input.status === "published" ? Boolean(d.publishedAt) : !d.publishedAt,
      ),
    ),
    create: jest.fn(async ({ data }: any) => {
      const d = { ...data, documentId: "doc_new", publishedAt: null };
      documents.push(d);
      return d;
    }),
    update: jest.fn(async ({ documentId, data }: any) => {
      const d = documents.find((d) => d.documentId === documentId)!;
      Object.assign(d, data);
      return d;
    }),
  };
  const reviewApi = {
    create: jest.fn(async ({ data }: any) => {
      assertReviewCreate({ params: { data } });
      const d = { ...data, id: decisions.length + 1 };
      decisions.push(d);
      return d;
    }),
  };
  const strapi = {
    documents: (uid: string) =>
      uid.includes("product-document-review") ? reviewApi : documentApi,
    db: {
      queryBuilder: () => {
        const builder = {
          select: () => builder,
          where: () => builder,
          orderBy: () => builder,
          transacting: () => builder,
          forUpdate: () => builder,
          execute: async () => [],
        };
        return builder;
      },
      connection: { client: { config: { client: "pg" } } },
      query: () => ({
        findMany: jest.fn(async ({ where }: any) =>
          decisions.filter((d) =>
            where.revision_key.$in.includes(d.revision_key),
          ),
        ),
      }),
      transaction: async (fn: any) => {
        let release: (() => void) | undefined;
        const raw = async (statement: string) => {
          sql.push(statement);
          if (statement.includes("pg_advisory_xact_lock")) {
            const previous = tail;
            tail = new Promise<void>((resolve) => {
              release = resolve;
            });
            await previous;
          }
        };
        try {
          return await fn({ trx: { raw } });
        } finally {
          release?.();
        }
      },
    },
  };
  return { strapi, documents, decisions, documentApi, reviewApi, sql };
}
beforeEach(() => jest.spyOn(Date, "now").mockReturnValue(now));
afterEach(() => jest.restoreAllMocks());

it("serializes concurrent exact-source imports into one native document identity and preserves retries", async () => {
  const env = setup();
  const [a, b] = await Promise.all([
    upsertNativeDocument(env.strapi, auth(), intake()),
    upsertNativeDocument(env.strapi, auth(), intake()),
  ]);
  expect(a.documentId).toBe(b.documentId);
  expect(env.documentApi.create).toHaveBeenCalledTimes(1);
  expect(
    env.sql.filter((s) => s.includes("pg_advisory_xact_lock")),
  ).toHaveLength(2);
  await upsertNativeDocument(env.strapi, auth(), {
    ...intake(),
    title: "Updated manual title",
  });
  expect(env.documents[0].title).toBe("Updated manual title");
  expect(env.documents[0].documentId).toBe("doc_new");
});
it("canonicalizes source identity and reports legacy ambiguity without modifying records", async () => {
  const env = setup();
  env.documents.push(
    { ...intake(), documentId: "doc_one", publishedAt: null },
    { ...intake(), documentId: "doc_two", publishedAt: null },
  );
  await expect(
    upsertNativeDocument(env.strapi, auth(), {
      ...intake(),
      source_url: "https://MANUFACTURER.example:443/hotend#section",
    }),
  ).rejects.toMatchObject({
    code: "ambiguous_identity",
    documentIds: ["doc_one", "doc_two"],
  });
  expect(env.documentApi.create).not.toHaveBeenCalled();
  expect(env.documentApi.update).not.toHaveBeenCalled();
});
it("protects published/reviewed content and refuses unsupported transaction backends", async () => {
  const env = setup();
  env.documents.push(approved());
  await expect(
    upsertNativeDocument(env.strapi, auth(), intake()),
  ).rejects.toMatchObject({ code: "protected_document" });
  expect(env.documentApi.update).not.toHaveBeenCalled();
  env.strapi.db.connection.client.config.client = "sqlite";
  await expect(
    upsertNativeDocument(env.strapi, auth(), intake()),
  ).rejects.toMatchObject({ code: "unsupported_database" });
});
it("authenticates before reads and rejects caller-controlled reviewer identity", async () => {
  const env = setup();
  await expect(
    upsertNativeDocument(
      env.strapi,
      { isAuthenticated: false, headers: { authorization: "Bearer forged" } },
      intake(),
    ),
  ).rejects.toMatchObject({ code: "unauthorized" });
  await expect(
    reviewNativeDocument(env.strapi, auth(), "doc_hotend", {
      ...review(),
      actor_id: "human_fake",
    }),
  ).rejects.toMatchObject({ code: "invalid_input" });
  expect(env.documentApi.findMany).not.toHaveBeenCalled();
  expect(env.reviewApi.create).not.toHaveBeenCalled();
});
it("records the verified token actor in an immutable native revision event and replays idempotently", async () => {
  const env = setup();
  const native = approved();
  env.documents.push(native);
  expect(nativeProjection(native, now)).toBeNull();
  const event = await reviewNativeDocument(
    env.strapi,
    auth(),
    native.documentId,
    review(),
  );
  expect(event).toMatchObject({
    actor_type: "content_api_token",
    actor_id: "41",
    content_revision: knowledgeRevision(native),
    target_document_id: native.documentId,
    decision: "approved",
  });
  const again = await reviewNativeDocument(
    env.strapi,
    auth(),
    native.documentId,
    review(),
  );
  expect(again.id).toBe(event.id);
  expect(env.reviewApi.create).toHaveBeenCalledTimes(1);
  expect(await loadReviewEvents(env.strapi, [native])).toEqual([event]);
  expect(nativeProjection(native, now, event)).toMatchObject({
    document_id: native.documentId,
  });
  native.knowledge_content.text += "unreviewed";
  expect(nativeProjection(native, now, event)).toBeNull();
});
it("rejects forged raw decision writes, mutation, stale revision and expired review", async () => {
  const env = setup();
  env.documents.push(approved());
  expect(() =>
    assertReviewCreate({
      params: { data: { actor_id: "41", actor_type: "content_api_token" } },
    }),
  ).toThrow();
  expect(() => immutableReviewMutation()).toThrow();
  await expect(
    reviewNativeDocument(env.strapi, auth(), "doc_hotend", {
      ...review(),
      revision_hash: "b".repeat(64),
    }),
  ).rejects.toMatchObject({ code: "revision_changed" });
  await expect(
    reviewNativeDocument(env.strapi, auth(), "doc_hotend", {
      ...review(),
      valid_until: "2026-10-08T11:00:00Z",
    }),
  ).rejects.toMatchObject({ code: "invalid_review" });
  expect(env.reviewApi.create).not.toHaveBeenCalled();
});

it("lets only an authenticated reviewer inspect the exact native revision before deciding", async () => {
  const env = setup();
  const native = approved();
  env.documents.push(native);
  await expect(
    previewNativeReview(env.strapi, {}, native.documentId, "published"),
  ).rejects.toMatchObject({ code: "unauthorized" });
  expect(env.documentApi.findMany).not.toHaveBeenCalled();
  expect(
    await previewNativeReview(
      env.strapi,
      auth(),
      native.documentId,
      "published",
    ),
  ).toMatchObject({
    revision_hash: knowledgeRevision(native),
    document: { document_id: native.documentId, variant_id: "variant_hotend" },
    current_decision: null,
  });
  expect(env.reviewApi.create).not.toHaveBeenCalled();
});
it("normalizes database timestamps on review replay and refuses conflicting immutable decisions", async () => {
  const env = setup();
  env.documents.push(approved());
  const event = await reviewNativeDocument(
    env.strapi,
    auth(),
    "doc_hotend",
    review(),
  );
  event.valid_until = new Date(event.valid_until).toISOString();
  expect(
    (await reviewNativeDocument(env.strapi, auth(), "doc_hotend", review())).id,
  ).toBe(event.id);
  await expect(
    reviewNativeDocument(env.strapi, auth(), "doc_hotend", {
      ...review(),
      decision: "rejected",
    }),
  ).rejects.toMatchObject({ code: "immutable_decision" });
  expect(env.reviewApi.create).toHaveBeenCalledTimes(1);
});

it("records product scope in an immutable native event and requires review when binding changes", async () => {
  const env = setup();
  const original = approved();
  const native = {
    ...original,
    knowledge_content: {
      ...original.knowledge_content,
      binding_scope: "product",
      variant_id: null,
    },
  };
  env.documents.push(native);
  const input = { ...review(), revision_hash: knowledgeRevision(native) };
  const event = await reviewNativeDocument(
    env.strapi,
    auth(),
    native.documentId,
    input,
  );
  expect(event).toMatchObject({
    binding_scope: "product",
    medusa_variant_id: null,
    actor_id: "41",
  });
  expect(nativeProjection(native, now, event)).toMatchObject({
    binding_scope: "product",
    variant_id: null,
  });
  const changed = {
    ...native,
    knowledge_content: {
      ...native.knowledge_content,
      binding_scope: "variant",
      variant_id: "variant_hotend",
    },
  };
  env.documents[0] = changed;
  expect(nativeProjection(changed, now, event)).toBeNull();
  await expect(
    reviewNativeDocument(env.strapi, auth(), native.documentId, input),
  ).rejects.toMatchObject({ code: "revision_changed" });
  const second = await reviewNativeDocument(
    env.strapi,
    auth(),
    native.documentId,
    { ...input, revision_hash: knowledgeRevision(changed) },
  );
  expect(second).toMatchObject({
    binding_scope: "variant",
    medusa_variant_id: "variant_hotend",
  });
  expect(env.decisions).toHaveLength(2);
  expect(event.binding_scope).toBe("product");
});
