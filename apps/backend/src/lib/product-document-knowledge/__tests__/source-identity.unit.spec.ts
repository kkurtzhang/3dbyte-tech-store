const {
  reviewNativeDocument,
  upsertNativeDocument,
} = require("../../../../../cms/src/api/product-document/utils/native-actions");
const {
  knowledgeRevision,
  approvedKnowledgeDocument,
} = require("../../../../../cms/src/api/product-document/utils/knowledge-reference");
const {
  assertReviewCreate,
} = require("../../../../../cms/src/api/product-document-review/utils/write-guard");

const now = Date.parse("2026-10-26T23:30:00Z");
const productId = "prod_01KSY6A5854QN8QEMN1V06ZA13";
const legacyUrl =
  "https://cdn.shopify.com/s/files/1/0548/7299/7945/files/PolyLite_PETG_TDS_EN_V5.4.pdf?v=1731954068";
const legacySha =
  "b12159542c10794d0da3153c9097ba134f4536d0c93e57a2756e1bd0cf5ac48d";
const retiredUrl =
  "https://us.polymaker.com/products/polylite-petg?variant=41266031198265";
const successorUrl =
  "https://shop.polymaker.com/products/petg?variant=45079221108793";
const auth = {
  isAuthenticated: true,
  auth: {
    strategy: { name: "content-api-token" },
    credentials: { id: 41, type: "full-access" },
  },
};
function document() {
  return {
    documentId: "x6dm0sld0hx2pp95e474qlv0",
    medusa_product_id: productId,
    product_title: "Polymaker PolyLite PETG 1.75mm 1kg",
    product_handle: "polymaker-polylite-petg-175-1kg",
    title: "PolyLite PETG legacy datasheet",
    source_url: legacyUrl,
    source_kind: "official_datasheet",
    source_checked_at: "2026-10-26T23:16:00Z",
    version: "PolyLite-PETG-TDS-EN-V5.4",
    publishedAt: "2026-10-26T23:20:00Z",
    is_public: true,
    knowledge_content: {
      version: 1,
      binding_scope: "product",
      variant_id: null as string | null,
      source_sha256: legacySha,
      text: "Manufacturer nozzle range: 230–260°C.",
      facts: [
        {
          field: "nozzle_temperature",
          label: "Manufacturer nozzle range",
          value: "230–260°C",
          evidence_excerpt: "230–260°C",
        },
      ],
    },
  };
}
function request(record: ReturnType<typeof document>, decision = "approved") {
  return {
    revision_hash: knowledgeRevision(record),
    status: "published",
    decision,
    valid_until: "2026-11-02T23:16:00Z",
    evidence_policy: "official_or_two_independent",
    review_note: "Test fixture review; no live approval.",
  };
}
function setup(record = document()) {
  const decisions: Record<string, unknown>[] = [];
  const documentApi = {
    findMany: jest.fn(async () => [record]),
    create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      ...data,
      documentId: "new_private_document",
    })),
    update: jest.fn(),
  };
  const reviewApi = {
    create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
      assertReviewCreate({ params: { data } });
      const event = { ...data, id: decisions.length + 1 };
      decisions.push(event);
      return event;
    }),
  };
  const builder = {
    select: () => builder,
    where: () => builder,
    orderBy: () => builder,
    transacting: () => builder,
    forUpdate: () => builder,
    execute: async () => [],
  };
  const strapi = {
    documents: (uid: string) =>
      uid.includes("product-document-review") ? reviewApi : documentApi,
    db: {
      connection: { client: { config: { client: "pg" } } },
      queryBuilder: () => builder,
      query: () => ({
        findMany: jest.fn(async () => decisions),
      }),
      transaction: async (
        run: (context: { trx: { raw: () => Promise<unknown[]> } }) => unknown,
      ) => run({ trx: { raw: async () => [] } }),
    },
  };
  return { strapi, decisions, documentApi, reviewApi };
}
function recordedEvent(record: ReturnType<typeof document>) {
  return {
    id: 1,
    actor_type: "content_api_token",
    actor_id: "41",
    decision: "approved",
    evidence_policy: "official_or_two_independent",
    target_document_id: record.documentId,
    medusa_product_id: record.medusa_product_id,
    binding_scope: record.knowledge_content.binding_scope,
    medusa_variant_id: record.knowledge_content.variant_id,
    content_revision: knowledgeRevision(record),
    decided_at: "2026-10-26T23:25:00Z",
    valid_until: "2026-11-02T23:16:00Z",
  };
}
beforeEach(() => jest.spyOn(Date, "now").mockReturnValue(now));
afterEach(() => jest.restoreAllMocks());

it.each([retiredUrl, successorUrl])(
  "refuses native approval of legacy product evidence from replaced source %s",
  async (url) => {
    const record = document();
    record.source_url = url;
    record.source_kind = "official_product_page";
    record.knowledge_content.source_sha256 = "a".repeat(64);
    record.knowledge_content.text = "New Formula outdoor performance.";
    record.knowledge_content.facts[0].value = "New Formula outdoor performance";
    record.knowledge_content.facts[0].evidence_excerpt =
      "New Formula outdoor performance";
    const env = setup(record);
    await expect(
      reviewNativeDocument(
        env.strapi,
        auth,
        record.documentId,
        request(record),
      ),
    ).rejects.toMatchObject({ code: "source_identity_conflict" });
    expect(env.reviewApi.create).not.toHaveBeenCalled();
  },
);
it("does not accept a changed source body merely because its URL still says PolyLite", async () => {
  const record = document();
  record.knowledge_content.source_sha256 = "b".repeat(64);
  const env = setup(record);
  await expect(
    reviewNativeDocument(env.strapi, auth, record.documentId, request(record)),
  ).rejects.toMatchObject({ code: "source_identity_conflict" });
  expect(env.decisions).toHaveLength(0);
});
it.each([
  "variant_01KSY6A5G61FCN57T1K9NWVBXN",
  "45079221108793",
  "41266031198265",
])(
  "does not turn a model datasheet into variant-specific evidence for %s",
  async (variant) => {
    const record = document();
    record.knowledge_content.binding_scope = "variant";
    record.knowledge_content.variant_id = variant;
    const env = setup(record);
    await expect(
      reviewNativeDocument(
        env.strapi,
        auth,
        record.documentId,
        request(record),
      ),
    ).rejects.toMatchObject({ code: "source_identity_conflict" });
    expect(env.decisions).toHaveLength(0);
  },
);
it("refuses a retired source during private native intake before any database access", async () => {
  const env = setup();
  await expect(
    upsertNativeDocument(env.strapi, auth, {
      medusa_product_id: productId,
      product_title: "Polymaker PolyLite PETG 1.75mm 1kg",
      product_handle: "polymaker-polylite-petg-175-1kg",
      title: "Official product page",
      document_type: "other",
      source_url: retiredUrl,
      source_kind: "official_product_page",
      source_label: "Manufacturer",
      source_checked_at: "2026-10-26T23:16:00Z",
      search_keywords: [],
      is_public: false,
    }),
  ).rejects.toMatchObject({ code: "source_identity_conflict" });
  expect(env.documentApi.findMany).not.toHaveBeenCalled();
  expect(env.documentApi.create).not.toHaveBeenCalled();
  expect(env.documentApi.update).not.toHaveBeenCalled();
});
it("hides unsafe approved evidence without rewriting its historical review event", () => {
  const record = document();
  record.source_url = successorUrl;
  const event = recordedEvent(record);
  const before = JSON.stringify({ record, event });
  expect(approvedKnowledgeDocument(record, now, event)).toBeNull();
  expect(JSON.stringify({ record, event })).toBe(before);
});
it("continues to approve the exact verified legacy source at product scope and replay immutably", async () => {
  const record = document();
  const env = setup(record);
  const event = await reviewNativeDocument(
    env.strapi,
    auth,
    record.documentId,
    request(record),
  );
  expect(approvedKnowledgeDocument(record, now, event)).toMatchObject({
    product_id: productId,
    binding_scope: "product",
    variant_id: null,
    source_sha256: legacySha,
  });
  const again = await reviewNativeDocument(
    env.strapi,
    auth,
    record.documentId,
    request(record),
  );
  expect(again).toEqual(event);
  expect(env.reviewApi.create).toHaveBeenCalledTimes(1);
});
it("allows an authorized reviewer to reject held source evidence", async () => {
  const record = document();
  record.source_url = successorUrl;
  const env = setup(record);
  const event = await reviewNativeDocument(
    env.strapi,
    auth,
    record.documentId,
    request(record, "rejected"),
  );
  expect(event.decision).toBe("rejected");
  expect(approvedKnowledgeDocument(record, now, event)).toBeNull();
});
it("preserves review behavior for unrelated product identities", async () => {
  const record = document();
  record.medusa_product_id = "prod_unrelated";
  record.source_url = "https://manufacturer.example/other-model";
  record.knowledge_content.source_sha256 = "c".repeat(64);
  const env = setup(record);
  const event = await reviewNativeDocument(
    env.strapi,
    auth,
    record.documentId,
    request(record),
  );
  expect(approvedKnowledgeDocument(record, now, event)).not.toBeNull();
});
