import { createHash } from "node:crypto";
import { parseKnowledgeBody } from "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs";
import {
  approved,
  fixtureReviewEvent,
  now,
  product,
} from "../../knowledge-reference/__tests__/fixtures";
import { verifiedReferenceDocument } from "../../knowledge-reference/contract";
import { knowledgeForPublishedProduct } from "../contract";
import { retrieveProductKnowledge } from "../retrieve";
import {
  reconcileProductDocuments,
  PUBLIC_KNOWLEDGE_INDEX_SETTINGS,
} from "../synchronize";
import { normalizeStrapiProductDocument } from "../../../modules/product-files/utils/public-documents";
const native = require("../../../../../cms/src/api/product-document/utils/knowledge-reference");

function scoped(
  scope: "product" | "variant",
  id = `doc_${scope}`,
  productId = "prod_hotend",
  variantId = "variant_hotend",
) {
  const original = approved();
  const record = {
    ...original,
    documentId: id,
    medusa_product_id: productId,
    knowledge_content: {
      ...original.knowledge_content,
      binding_scope: scope,
      variant_id: scope === "product" ? null : variantId,
    },
  };
  const event = {
    ...fixtureReviewEvent(original),
    target_document_id: id,
    medusa_product_id: productId,
    binding_scope: scope,
    medusa_variant_id: record.knowledge_content.variant_id,
    content_revision: native.knowledgeRevision(record),
  };
  return {
    record,
    event,
    body: native.knowledgeBody(record),
    doc: native.approvedKnowledgeDocument(record, now, event),
  };
}

it("accepts explicit product scope with a null variant and preserves unknown facts", () => {
  const { body, doc } = scoped("product");
  expect(body).toMatchObject({ binding_scope: "product", variant_id: null });
  expect(doc.facts[1].value).toBeNull();
  expect(verifiedReferenceDocument(doc, now)).toEqual(doc);
  expect(
    knowledgeForPublishedProduct(
      doc,
      { ...product(), status: "published", variants: [] },
      now,
    ),
  ).toEqual(doc);
});

it.each([
  { binding_scope: "product", variant_id: "variant_hotend" },
  { binding_scope: "product", variant_id: undefined },
  { binding_scope: "variant", variant_id: null },
  { binding_scope: undefined, variant_id: null },
  { binding_scope: "batch", variant_id: "variant_hotend" },
  { binding_scope: null, variant_id: "variant_hotend" },
])("rejects invalid scope/variant combinations %j", (binding) => {
  const body = native.knowledgeBody(approved());
  expect(parseKnowledgeBody({ ...body, ...binding })).toBeNull();
});

it("preserves the exact legacy variant hash and approval without inventing product scope", () => {
  const record = approved(),
    body = native.knowledgeBody(record);
  const expected = createHash("sha256")
    .update(JSON.stringify(body))
    .digest("hex");
  expect(expected).toBe(
    "e90d0173bae6cf2b3dca92869334b3f145af09ef6fb73a2dbfc22a754be3a661",
  );
  expect(body).not.toHaveProperty("binding_scope");
  expect(native.knowledgeRevision(record)).toBe(expected);
  expect(
    native.approvedKnowledgeDocument(record, now, fixtureReviewEvent(record)),
  ).not.toBeNull();
});

it("hashes explicit binding scope and invalidates approval when scope or exact variant changes", () => {
  const legacy = approved(),
    variant = scoped("variant", legacy.documentId),
    p = scoped("product", legacy.documentId);
  expect(variant.body.binding_scope).toBe("variant");
  expect(
    new Set([
      native.knowledgeRevision(legacy),
      native.knowledgeRevision(variant.record),
      native.knowledgeRevision(p.record),
    ]).size,
  ).toBe(3);
  expect(
    native.approvedKnowledgeDocument(p.record, now, variant.event),
  ).toBeNull();
  expect(
    native.approvedKnowledgeDocument(variant.record, now, p.event),
  ).toBeNull();
  const changed = {
    ...variant.record,
    knowledge_content: {
      ...variant.record.knowledge_content,
      variant_id: "variant_other",
    },
  };
  expect(
    native.approvedKnowledgeDocument(changed, now, variant.event),
  ).toBeNull();
  expect(
    native.approvedKnowledgeDocument(p.record, now, {
      ...p.event,
      binding_scope: null,
    }),
  ).toBeNull();
  expect(
    native.approvedKnowledgeDocument(p.record, now, {
      ...p.event,
      medusa_variant_id: "variant_hotend",
    }),
  ).toBeNull();
});

function fixture() {
  const records = [
    scoped("product"),
    scoped("variant"),
    scoped("variant", "doc_second", "prod_hotend", "variant_second"),
    scoped("product", "doc_other_product", "prod_other"),
  ];
  const candidates: Record<string, unknown>[] = [
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `metadata_${i}`,
      medusa_product_id: "prod_hotend",
    })),
    ...records.map(({ record, event }) => ({
      id: record.documentId,
      medusa_product_id: record.medusa_product_id,
      knowledge_binding_scope: event.binding_scope,
      knowledge_variant_id: event.medusa_variant_id,
      knowledge_revision_hash: event.content_revision,
    })),
  ];
  const search = jest.fn(
    async (
      _text: string,
      _type: string,
      options: { filter: string[]; limit: number },
    ) => {
      let hits = candidates;
      for (const filter of options.filter) {
        if (filter === "knowledge_revision_hash EXISTS")
          hits = hits.filter((h) => Boolean(h.knowledge_revision_hash));
        else if (filter === "knowledge_variant_id EXISTS")
          hits = hits.filter((h) => typeof h.knowledge_variant_id === "string");
        else if (filter.startsWith("(knowledge_binding_scope")) {
          const variant = /knowledge_variant_id = "([^"]+)"/.exec(filter)![1];
          hits = hits.filter(
            (h) =>
              h.knowledge_binding_scope === "product" ||
              h.knowledge_variant_id === variant,
          );
        } else {
          const match =
            /^(medusa_product_id|knowledge_variant_id) = "([^"]+)"$/.exec(
              filter,
            )!;
          hits = hits.filter((h) => h[match[1]] === match[2]);
        }
      }
      return { hits: hits.slice(0, options.limit) };
    },
  );
  const current = [
    {
      ...product(),
      status: "published",
      variants: [{ id: "variant_hotend" }, { id: "variant_second" }],
    },
    {
      ...product(),
      id: "prod_other",
      status: "published",
      variants: [{ id: "variant_elsewhere" }],
    },
  ];
  return {
    records,
    candidates,
    current,
    strapi: {
      listProductDocuments: jest.fn(async () =>
        records.map(({ record, doc }) => ({
          ...normalizeStrapiProductDocument(record),
          approved_knowledge: doc,
        })),
      ),
      getKnowledgeReference: jest.fn(
        async (id: string) =>
          records.find((r) => r.record.documentId === id)?.doc ?? null,
      ),
    },
    meilisearch: {
      search,
      configureIndex: jest.fn(async () => {}),
      indexData: jest.fn(async () => {}),
      listDocumentIds: jest.fn(async () => []),
      deleteFromIndex: jest.fn(async () => {}),
    },
    query: {
      graph: jest.fn(
        async (input: { entity: string; filters: { id: string[] } }) => {
          if (input.entity === "product_variant") {
            const data = current.flatMap((p) =>
              p.variants
                .filter((v) => input.filters.id.includes(v.id))
                .map((v) => ({
                  id: v.id,
                  product: { id: p.id, status: p.status },
                })),
            );
            return { data, metadata: { count: data.length } };
          }
          const data = current.filter((p) => input.filters.id.includes(p.id));
          return { data, metadata: { count: data.length } };
        },
      ),
    },
    now,
  };
}

it("indexes product and variant knowledge with explicit scope while retaining metadata starvation protection", async () => {
  const options = fixture();
  const result = await reconcileProductDocuments(options);
  expect(result.knowledge_indexed).toBe(4);
  expect(options.meilisearch.indexData).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({
        id: "doc_product",
        knowledge_binding_scope: "product",
        knowledge_variant_id: null,
      }),
    ]),
    "product_document",
  );
  expect(PUBLIC_KNOWLEDGE_INDEX_SETTINGS.filterableAttributes).toEqual(
    expect.arrayContaining([
      "knowledge_binding_scope",
      "knowledge_revision_hash",
    ]),
  );
  const found = await retrieveProductKnowledge({
    ...options,
    queryText: "manual",
    productId: "prod_hotend",
  });
  expect(found.documents.map((d) => d.document_id)).toEqual([
    "doc_product",
    "doc_variant",
    "doc_second",
  ]);
  expect(found.citations[0]).toMatchObject({
    binding_scope: "product",
    variant_id: null,
  });
});

it.each([undefined, "prod_hotend"])(
  "variant queries include general facts only for the owning product (%s)",
  async (productId) => {
    const options = fixture();
    const result = await retrieveProductKnowledge({
      ...options,
      queryText: "manual",
      productId,
      variantId: "variant_hotend",
    });
    expect(result.documents.map((d) => d.document_id)).toEqual([
      "doc_product",
      "doc_variant",
    ]);
    expect(result.citations.map((c) => c.variant_id)).toEqual([
      null,
      "variant_hotend",
    ]);
  },
);

it("rejects cross-product requests, nonexistent variants and forged scope candidates", async () => {
  const options = fixture();
  expect(
    (
      await retrieveProductKnowledge({
        ...options,
        queryText: "manual",
        productId: "prod_other",
        variantId: "variant_hotend",
      })
    ).documents,
  ).toEqual([]);
  expect(
    (
      await retrieveProductKnowledge({
        ...options,
        queryText: "manual",
        productId: "prod_hotend",
        variantId: "variant_unknown",
      })
    ).documents,
  ).toEqual([]);
  const variantHit = options.candidates.find((c) => c.id === "doc_variant")!;
  variantHit.knowledge_binding_scope = "product";
  variantHit.knowledge_variant_id = null;
  expect(
    (
      await retrieveProductKnowledge({
        ...options,
        queryText: "manual",
        productId: "prod_hotend",
        variantId: "variant_second",
      })
    ).documents.map((d) => d.document_id),
  ).toEqual(["doc_product", "doc_second"]);
});

it.each([undefined, "prod_hotend"])(
  "keeps owning model and exact-variant evidence ahead of eight unrelated approved hits (%s)",
  async (productId) => {
    const options = fixture();
    const foreign = options.candidates.find(
      (c) => c.id === "doc_other_product",
    )!;
    options.candidates.unshift(
      ...Array.from({ length: 8 }, (_, i) => ({
        ...foreign,
        id: `unrelated_approved_${i}`,
      })),
    );
    const result = await retrieveProductKnowledge({
      ...options,
      queryText: "manual",
      productId,
      variantId: "variant_hotend",
    });
    expect(result.documents.map((d) => d.document_id)).toEqual([
      "doc_product",
      "doc_variant",
    ]);
    expect(result.citations.map((c) => c.variant_id)).toEqual([
      null,
      "variant_hotend",
    ]);
    expect(options.meilisearch.search).toHaveBeenCalledWith(
      "manual",
      "product_document",
      {
        limit: 8,
        filter: expect.arrayContaining(['medusa_product_id = "prod_hotend"']),
      },
    );
  },
);

it.each([
  { productId: "prod_other", variantId: "variant_hotend" },
  { variantId: "variant_missing" },
  { productId: "prod_hotend", variantId: "variant_missing" },
])(
  "rejects an unknown or conflicting variant before search (%j)",
  async (scope) => {
    const options = fixture();
    expect(
      await retrieveProductKnowledge({
        ...options,
        queryText: "manual",
        ...scope,
      }),
    ).toEqual({ documents: [], citations: [] });
    expect(options.meilisearch.search).not.toHaveBeenCalled();
    expect(options.strapi.getKnowledgeReference).not.toHaveBeenCalled();
  },
);

it("stops before search when the variant ownership graph is unavailable", async () => {
  const options = fixture();
  options.query.graph.mockRejectedValueOnce(new Error("graph outage"));
  await expect(
    retrieveProductKnowledge({
      ...options,
      queryText: "manual",
      variantId: "variant_hotend",
    }),
  ).rejects.toThrow();
  expect(options.meilisearch.search).not.toHaveBeenCalled();
  expect(options.strapi.getKnowledgeReference).not.toHaveBeenCalled();
});

it.each([
  { data: [], metadata: { count: 1 } },
  {
    data: [
      {
        id: "variant_wrong",
        product: { id: "prod_hotend", status: "published" },
      },
    ],
    metadata: { count: 1 },
  },
  {
    data: [
      {
        id: "variant_hotend",
        product: { id: 'invalid"id', status: "published" },
      },
    ],
    metadata: { count: 1 },
  },
  {
    data: [
      {
        id: "variant_hotend",
        product: { id: "prod_hotend", status: "published" },
      },
    ],
    metadata: {},
  },
  {
    data: Array(2).fill({
      id: "variant_hotend",
      product: { id: "prod_hotend", status: "published" },
    }),
    metadata: { count: 2 },
  },
])(
  "rejects incomplete or ambiguous variant ownership before search (%j)",
  async (snapshot) => {
    const options = fixture();
    options.query.graph.mockResolvedValueOnce(snapshot);
    await expect(
      retrieveProductKnowledge({
        ...options,
        queryText: "manual",
        variantId: "variant_hotend",
      }),
    ).rejects.toThrow();
    expect(options.meilisearch.search).not.toHaveBeenCalled();
  },
);

it("does not search for a variant owned by an unpublished product", async () => {
  const options = fixture();
  options.current[0].status = "draft";
  expect(
    await retrieveProductKnowledge({
      ...options,
      queryText: "manual",
      variantId: "variant_hotend",
    }),
  ).toEqual({ documents: [], citations: [] });
  expect(options.meilisearch.search).not.toHaveBeenCalled();
});

it("rechecks current ownership after the search if the variant has moved", async () => {
  const options = fixture();
  const search = options.meilisearch.search.getMockImplementation()!;
  options.meilisearch.search.mockImplementation(async (...args) => {
    const result = await search(...args);
    options.current[0].variants = [{ id: "variant_second" }];
    return result;
  });
  expect(
    await retrieveProductKnowledge({
      ...options,
      queryText: "manual",
      variantId: "variant_hotend",
    }),
  ).toEqual({ documents: [], citations: [] });
});
