import { approved, now } from "../../knowledge-reference/__tests__/fixtures";
const {
  previewAdminReview,
  reviewAdminDocument,
  registerAdminReview,
  DOCUMENT_UID,
  REVIEW_ACTION,
  PILOT_PRODUCTS,
  READ_FIELDS,
} = require("../../../../../cms/src/knowledge-review/server");
const {
  knowledgeRevision,
  approvedKnowledgeDocument,
} = require("../../../../../cms/src/api/product-document/utils/knowledge-reference");
const {
  reviewNativeDocument,
} = require("../../../../../cms/src/api/product-document/utils/native-actions");
const {
  assertReviewCreate,
} = require("../../../../../cms/src/api/product-document-review/utils/write-guard");
const ID = "mu3sv3poa965a25lvvlbdngc";
function setup() {
  const record = {
    ...approved(),
    documentId: ID,
    medusa_product_id: "prod_01KSY6A5870Y2J3VR66XAWP9GD",
    createdBy: { id: 7 },
  };
  const events: Record<string, unknown>[] = [],
    calls: string[] = [];
  const can = jest.fn(
    (_action: string, _entity?: unknown, _field?: string) => true,
  );
  const ability = { can },
    user = { id: 7, isActive: true };
  const state = {
    isAuthenticated: true,
    user,
    userAbility: ability,
    auth: { strategy: { name: "admin" }, credentials: user, ability },
  };
  const docApi = {
    findMany: jest.fn(async () => {
      calls.push("read");
      return [record];
    }),
    update: jest.fn(),
    publish: jest.fn(),
  };
  const reviewApi = {
    create: jest.fn(async ({ data }: any) => {
      assertReviewCreate({ params: { data } });
      const event = { ...data, id: 1 };
      events.push(event);
      return event;
    }),
  };
  const qb: Record<string, jest.Mock> = {};
  for (const name of ["select", "where", "orderBy", "forUpdate", "transacting"])
    qb[name] = jest.fn(() => qb);
  qb.execute = jest.fn(async () => {
    calls.push("lock");
    return [{ id: 1 }];
  });
  const checker = {
    can: Object.assign(can, {
      read: (r: unknown, f: string) =>
        can("plugin::content-manager.explorer.read", r, f),
      update: (r: unknown, f: string) =>
        can("plugin::content-manager.explorer.update", r, f),
    }),
  };
  const register = jest.fn();
  const strapi = {
    documents: (uid: string) =>
      uid.includes("product-document-review") ? reviewApi : docApi,
    plugin: () => ({ service: () => ({ create: () => checker }) }),
    service: () => ({ actionProvider: { register } }),
    server: { routes: jest.fn() },
    log: { error: jest.fn() },
    db: {
      connection: { client: { config: { client: "pg" } } },
      queryBuilder: () => qb,
      transaction: async (fn: any) => fn({ trx: { raw: jest.fn() } }),
      query: () => ({ findMany: jest.fn(async () => events) }),
    },
  };
  const payload = () => ({
    status: "published",
    revision_hash: knowledgeRevision(record),
    decision: "approved",
    evidence_policy: "official_or_two_independent",
    valid_until: "2026-10-20T00:00:00Z",
    review_note: "Checked exact product and evidence; synthetic test.",
  });
  return {
    record,
    events,
    calls,
    can,
    state,
    docApi,
    reviewApi,
    qb,
    strapi,
    payload,
    register,
  };
}
beforeEach(() => jest.spyOn(Date, "now").mockReturnValue(now));
afterEach(() => jest.restoreAllMocks());
it("returns the canonical packet after field and entity checks", async () => {
  const e = setup(),
    packet = await previewAdminReview(e.strapi, e.state, ID, "published");
  expect(packet.document.document_id).toBe(ID);
  expect(packet.revision_hash).toBe(knowledgeRevision(e.record));
  expect(packet.current_decision).toBeNull();
  for (const field of READ_FIELDS)
    expect(e.can).toHaveBeenCalledWith(
      "plugin::content-manager.explorer.read",
      e.record,
      field,
    );
  expect(e.can).toHaveBeenCalledWith(
    REVIEW_ACTION,
    e.record,
    "knowledge_content",
  );
  expect(e.can).toHaveBeenCalledWith(
    "plugin::content-manager.explorer.update",
    e.record,
    "knowledge_content",
  );
});
it.each([
  {},
  { isAuthenticated: true },
  { isAuthenticated: false },
  { user: { id: 7 } },
])("rejects forged state %p before reads", async (state) => {
  const e = setup();
  await expect(
    previewAdminReview(e.strapi, state, ID, "published"),
  ).rejects.toMatchObject({ code: "unauthorized" });
  expect(e.docApi.findMany).not.toHaveBeenCalled();
});
it.each(["content-api-token", "admin-api-token", "users-permissions"])(
  "rejects %s at Admin boundary",
  async (strategy) => {
    const e = setup();
    e.state.auth.strategy.name = strategy;
    await expect(
      reviewAdminDocument(e.strapi, e.state, ID, e.payload()),
    ).rejects.toMatchObject({ code: "unauthorized" });
    expect(e.events).toHaveLength(0);
  },
);
it.each([
  "missing-review",
  "missing-read",
  "missing-update",
  "other-model",
  "private-field",
  "other-record",
])("denies %s", async (mode) => {
  const e = setup();
  e.can.mockImplementation((action, entity, field) => {
    if (mode === "missing-review") return action !== REVIEW_ACTION;
    if (mode === "missing-read")
      return action !== "plugin::content-manager.explorer.read";
    if (mode === "missing-update")
      return action !== "plugin::content-manager.explorer.update";
    if (mode === "other-model") return false;
    if (mode === "private-field") return field !== "knowledge_content";
    return entity === undefined;
  });
  await expect(
    previewAdminReview(e.strapi, e.state, ID, "published"),
  ).rejects.toMatchObject({ code: "forbidden" });
  await expect(
    reviewAdminDocument(e.strapi, e.state, ID, e.payload()),
  ).rejects.toMatchObject({ code: "forbidden" });
  expect(e.events).toHaveLength(0);
});
it.each(["doc_unrelated", "__proto__", "constructor", "", null])(
  "rejects out-of-pilot ID %p",
  async (id) => {
    const e = setup();
    await expect(
      previewAdminReview(e.strapi, e.state, id, "published"),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(e.docApi.findMany).not.toHaveBeenCalled();
  },
);
it("rejects changed product association", async () => {
  const e = setup();
  e.record.medusa_product_id = "prod_unrelated";
  await expect(
    reviewAdminDocument(e.strapi, e.state, ID, e.payload()),
  ).rejects.toMatchObject({ code: "forbidden" });
  expect(e.events).toHaveLength(0);
});
it.each([
  "actor_id",
  "actor_type",
  "decided_at",
  "model",
  "is_public",
  "publish",
])("rejects caller-controlled %s", async (key) => {
  const e = setup();
  await expect(
    reviewAdminDocument(e.strapi, e.state, ID, {
      ...e.payload(),
      [key]: "forged",
    }),
  ).rejects.toMatchObject({ code: "invalid_input" });
  expect(e.events).toHaveLength(0);
});
it("locks before reading, uses verified Admin identity, never publishes", async () => {
  const e = setup(),
    result = await reviewAdminDocument(e.strapi, e.state, ID, e.payload());
  expect(e.calls).toEqual(["lock", "read"]);
  expect(e.qb.forUpdate).toHaveBeenCalled();
  expect(result.actor_type).toBe("admin_user");
  expect(result.actor_id).toBe("7");
  expect(e.docApi.update).not.toHaveBeenCalled();
  expect(e.docApi.publish).not.toHaveBeenCalled();
  expect(approvedKnowledgeDocument(e.record, now, e.events[0])).not.toBeNull();
});
it("rejects an edit committed while waiting for row lock", async () => {
  const e = setup(),
    payload = e.payload();
  e.qb.execute.mockImplementation(async () => {
    e.record.title = "Changed";
  });
  await expect(
    reviewAdminDocument(e.strapi, e.state, ID, payload),
  ).rejects.toMatchObject({ code: "revision_changed" });
  expect(e.events).toHaveLength(0);
});
it("invalidates edited content and never makes a draft public", async () => {
  const e = setup();
  await reviewAdminDocument(e.strapi, e.state, ID, e.payload());
  expect(
    approvedKnowledgeDocument(
      { ...e.record, publishedAt: null },
      now,
      e.events[0],
    ),
  ).toBeNull();
  expect(
    approvedKnowledgeDocument(
      { ...e.record, is_public: false },
      now,
      e.events[0],
    ),
  ).toBeNull();
  e.record.title = "Changed";
  expect(approvedKnowledgeDocument(e.record, now, e.events[0])).toBeNull();
});
it("preserves a token actor on idempotent Admin retry", async () => {
  const e = setup(),
    token = {
      isAuthenticated: true,
      auth: {
        strategy: { name: "content-api-token" },
        credentials: { id: 41, type: "full-access" },
      },
    };
  await reviewNativeDocument(e.strapi, token, ID, e.payload());
  const result = await reviewAdminDocument(e.strapi, e.state, ID, e.payload());
  expect(result.actor_type).toBe("content_api_token");
  expect(result.actor_id).toBe("41");
  expect(e.events).toHaveLength(1);
  expect(
    approvedKnowledgeDocument(e.record, now, {
      ...e.events[0],
      actor_type: "human",
    }),
  ).toBeNull();
});
it("registers normal Admin auth and a model/field permission without granting roles", async () => {
  const e = setup();
  await registerAdminReview(e.strapi);
  expect(Object.keys(PILOT_PRODUCTS)).toHaveLength(2);
  expect(e.register).toHaveBeenCalledWith(
    expect.objectContaining({
      section: "contentTypes",
      uid: "knowledge-review.review",
      subjects: [DOCUMENT_UID],
      options: { applyToProperties: ["fields"] },
    }),
  );
  const routes = e.strapi.server.routes.mock.calls[0][0];
  expect(routes.type).toBe("admin");
  expect(routes.routes).toHaveLength(2);
  for (const r of routes.routes)
    expect(r.config).toMatchObject({
      auth: { strategies: ["admin"], scope: [REVIEW_ACTION] },
      policies: ["admin::isAuthenticatedAdmin"],
    });
});

it.each(["inactive", "identity-mismatch", "ability-mismatch", "invalid-id"])(
  "rejects inconsistent verified identity: %s",
  async (mode) => {
    const e = setup();
    if (mode === "inactive") e.state.auth.credentials.isActive = false;
    if (mode === "identity-mismatch")
      e.state.user = { ...e.state.user, id: 99 };
    if (mode === "ability-mismatch")
      e.state.userAbility = {
        can: jest.fn(
          (_action: string, _entity?: unknown, _field?: string) => true,
        ),
      };
    if (mode === "invalid-id") e.state.auth.credentials.id = 0;
    await expect(
      previewAdminReview(e.strapi, e.state, ID, "published"),
    ).rejects.toMatchObject({ code: "unauthorized" });
    expect(e.docApi.findMany).not.toHaveBeenCalled();
  },
);
it("returns decision metadata without stored notes or account profiles", async () => {
  const e = setup();
  await reviewAdminDocument(e.strapi, e.state, ID, e.payload());
  const packet = await previewAdminReview(e.strapi, e.state, ID, "published");
  expect(packet.current_decision).toMatchObject({
    actor_type: "admin_user",
    actor_id: "7",
    decision: "approved",
  });
  expect(packet.current_decision).not.toHaveProperty("review_note");
  expect(packet.current_decision).not.toHaveProperty("revision_key");
});
it("enforces route query/body boundaries, private caching and safe failures", async () => {
  const e = setup();
  await registerAdminReview(e.strapi);
  const routes = e.strapi.server.routes.mock.calls[0][0].routes;
  const context = (
    query: Record<string, unknown> = { status: "published" },
  ) => ({
    state: e.state,
    params: { documentId: ID },
    query,
    request: { body: e.payload() },
    set: jest.fn(),
    body: undefined as any,
    status: 200,
  });
  const valid = context();
  await routes[0].handler(valid);
  expect(valid.body.data.document.document_id).toBe(ID);
  expect(valid.set).toHaveBeenCalledWith("Cache-Control", "no-store");
  const unexpected = context({ status: "published", populate: "*" });
  await routes[0].handler(unexpected);
  expect(unexpected.status).toBe(400);
  const badStatus = context({ status: "any" });
  await routes[0].handler(badStatus);
  expect(badStatus.status).toBe(400);
  const denied = context();
  denied.state.isAuthenticated = false;
  await routes[0].handler(denied);
  expect(denied.status).toBe(403);
  e.state.isAuthenticated = true;
  const stale = context({});
  stale.request.body.revision_hash = "a".repeat(64);
  await routes[1].handler(stale);
  expect(stale.status).toBe(409);
  const written = context({});
  await routes[1].handler(written);
  expect(written.body.data.actor_type).toBe("admin_user");
  e.docApi.findMany.mockRejectedValueOnce(
    new Error("private operational detail"),
  );
  const fail = context();
  await routes[0].handler(fail);
  expect(fail.status).toBe(503);
  expect(JSON.stringify(fail.body)).not.toContain("private operational detail");
});

it.each([["admin_user"], { toString: () => "admin_user" }, null])(
  "rejects a non-string persisted actor type",
  async (actor_type) => {
    const e = setup();
    await reviewAdminDocument(e.strapi, e.state, ID, e.payload());
    expect(
      approvedKnowledgeDocument(e.record, now, { ...e.events[0], actor_type }),
    ).toBeNull();
  },
);
