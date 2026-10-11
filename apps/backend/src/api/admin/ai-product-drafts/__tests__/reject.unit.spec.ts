import { POST } from "../[id]/reject/route";
import { draftReviewHash } from "../../../../lib/ai-product-drafts/quality";

const reviewable = {
  id: "aipd_redundant",
  status: "needs_review",
  raw_packet: {
    packet_version: 1,
    product_input: { product_name: "Synthetic part" },
  },
  normalized_draft: { content_draft: { title: "Synthetic part" } },
  resolved_operation: "create",
  approved_at: null,
  imported_at: null,
  import_progress: null,
};
function fixture(state = { ...reviewable }) {
  const context = { transactionManager: "synthetic-test-context" };
  const events: unknown[] = [];
  const module = {
    listAiProductDrafts: jest.fn(async () => [state]),
    updateAiProductDrafts: jest.fn(async (change) => {
      Object.assign(state, change);
      return { ...state };
    }),
    createAiProductDraftEvents: jest.fn(async (event) => {
      events.push(event);
      return event;
    }),
    withDraftTransaction: jest.fn(async (job) => {
      const before = structuredClone(state);
      const previousEvents = [...events];
      try {
        return await job(context);
      } catch (error) {
        Object.assign(state, before);
        events.splice(0, events.length, ...previousEvents);
        throw error;
      }
    }),
  };
  const req = {
    params: { id: state.id },
    body: {
      reason:
        "Redundant research; retain the canonical draft and both histories.",
      review_hash: draftReviewHash(state),
    },
    auth_context: { actor_id: "synthetic_admin" },
    scope: {
      resolve: (key: string) => {
        if (key === "aiProductDraft") return module;
        if (key === "locking")
          return {
            execute: async (_keys: string[], job: () => Promise<unknown>) =>
              job(),
          };
        throw new Error("Unexpected module");
      },
    },
  };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { state, events, context, module, req, res };
}
describe("reversible draft rejection", () => {
  it("requires the currently reviewed revision before changing the list", async () => {
    const f = fixture();
    f.req.body.review_hash = "";
    await POST(f.req as never, f.res as never);
    expect(f.res.status).toHaveBeenCalledWith(409);
    expect(f.module.updateAiProductDrafts).not.toHaveBeenCalled();
  });
  it("refuses a stale revision even when the rejection reason is present", async () => {
    const f = fixture();
    f.req.body.review_hash = "older-revision";
    await POST(f.req as never, f.res as never);
    expect(f.res.status).toHaveBeenCalledWith(409);
    expect(f.events).toHaveLength(0);
    expect(f.state.status).toBe("needs_review");
  });
  it.each([
    { approved_at: "2026-10-10T00:00:00Z" },
    { imported_at: "2026-10-10T00:00:00Z" },
    { import_progress: { product_id: "prod_partial" } },
    { status: "approved" },
    { status: "imported" },
    { status: "received" },
    { status: "rejected" },
  ])("preserves protected or terminal state: %j", async (change) => {
    const f = fixture({ ...reviewable, ...change } as typeof reviewable);
    await POST(f.req as never, f.res as never);
    expect(f.res.status).toHaveBeenCalledWith(409);
    expect(f.module.updateAiProductDrafts).not.toHaveBeenCalled();
    expect(f.events).toHaveLength(0);
  });
  it("rolls back rejection when its audit event fails", async () => {
    const f = fixture();
    f.module.createAiProductDraftEvents.mockRejectedValueOnce(
      new Error("Synthetic audit failure"),
    );
    await expect(POST(f.req as never, f.res as never)).rejects.toThrow(
      "Synthetic audit failure",
    );
    expect(f.state.status).toBe("needs_review");
    expect(f.events).toHaveLength(0);
  });
  it("commits the same reviewed reason and revision in retained history", async () => {
    const f = fixture();
    await POST(f.req as never, f.res as never);
    expect(f.res.status).toHaveBeenCalledWith(200);
    expect(f.state.status).toBe("rejected");
    expect(f.events).toEqual([
      expect.objectContaining({
        draft_id: f.state.id,
        type: "rejected",
        actor_type: "admin",
        actor_id: "synthetic_admin",
        from_status: "needs_review",
        to_status: "rejected",
        metadata: {
          reason: f.req.body.reason,
          review_hash: f.req.body.review_hash,
        },
      }),
    ]);
    expect(f.module.updateAiProductDrafts).toHaveBeenCalledWith(
      expect.any(Object),
      f.context,
    );
    expect(f.module.createAiProductDraftEvents).toHaveBeenCalledWith(
      expect.any(Object),
      f.context,
    );
  });
  it("requires a rejection reason without starting a write", async () => {
    const f = fixture();
    f.req.body.reason = " ";
    await POST(f.req as never, f.res as never);
    expect(f.res.status).toHaveBeenCalledWith(400);
    expect(f.module.withDraftTransaction).not.toHaveBeenCalled();
  });
});
