import {
  prepareSupportTicket,
  previewSupportTicket,
  confirmSupportTicket,
} from "../consent-handlers";
import {
  consentStore,
  ConsentConflict,
  consentHash,
  type ConsentRecord,
} from "../consent-store";
import { dispatchInitialTicketDeliveries } from "../delivery";

jest.mock("../delivery", () => ({
  ...jest.requireActual("../delivery"),
  dispatchInitialTicketDeliveries: jest.fn().mockResolvedValue("queued"),
}));
jest.mock("../consent-store", () => {
  const actual = jest.requireActual("../consent-store");
  const records = new Map<string, string>();
  return {
    ...actual,
    consentStore: {
      create: jest.fn(async (id: string, record: ConsentRecord) => {
        records.set(id, JSON.stringify(record));
      }),
      read: jest.fn(async (id: string, context: string) => {
        const raw = records.get(id);
        if (!raw) throw new actual.ConsentConflict();
        const record = JSON.parse(raw);
        if (record.context !== context || record.expiresAt <= Date.now())
          throw new actual.ConsentConflict();
        return { raw, record };
      }),
      replace: jest.fn(
        async (id: string, raw: string, record: ConsentRecord) => {
          if (records.get(id) !== raw) throw new actual.ConsentConflict();
          records.set(id, JSON.stringify(record));
        },
      ),
    },
  };
});
const draft = {
  name: "Synthetic Customer",
  email: "synthetic@example.invalid",
  subject: "Synthetic support",
  message: "Synthetic question",
  order_reference: "SYNTHETIC-ORDER",
  transcript_excerpt: "user: synthetic context",
};
function fixture(session = "a".repeat(64), customerId?: string) {
  const module = {
    listSupportTickets: jest.fn().mockResolvedValue([]),
    listSupportTicketEvents: jest.fn().mockResolvedValue([]),
    createSupportTicketEvents: jest.fn().mockResolvedValue({}),
    createConfirmedAiHandoff: jest.fn().mockResolvedValue({
      id: "synthetic-ticket",
      ticket_number: "SYNTHETIC-TICKET",
      status: "new",
    }),
  };
  const graph = jest.fn(async ({ entity }) => ({
    data:
      entity === "customer"
        ? [{ id: customerId }]
        : [
            {
              id: "synthetic-order",
              customer_id: customerId,
              email: draft.email,
            },
          ],
  }));
  const req = {
    body: {} as unknown,
    auth_context: customerId ? { actor_id: customerId } : undefined,
    get: (name: string) =>
      name === "x-3db-internal-token"
        ? "synthetic-internal"
        : name === "x-3db-assistant-session"
        ? session
        : undefined,
    scope: {
      resolve: (key: string) =>
        key === "supportTicket"
          ? module
          : key === "query"
          ? { graph }
          : { warn: jest.fn() },
    },
  };
  async function call(handler: typeof prepareSupportTicket, body: unknown) {
    req.body = body;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await handler(req as never, res as never);
    return {
      code: res.status.mock.calls[0]?.[0] || 200,
      body: res.json.mock.calls[0]?.[0],
    };
  }
  async function prepare() {
    return (await call(prepareSupportTicket, draft)).body;
  }
  async function preview(proposalId: string, includeTranscript = false) {
    return call(previewSupportTicket, { proposalId, includeTranscript });
  }
  return { module, graph, req, call, prepare, preview };
}
const confirmation = (preview: {
  proposalId: string;
  receipt: string;
  digest: string;
}) => ({
  proposalId: preview.proposalId,
  receipt: preview.receipt,
  digest: preview.digest,
  confirmed: true,
});
const originalRead = jest.mocked(consentStore.read).getMockImplementation()!;
const originalReplace = jest
  .mocked(consentStore.replace)
  .getMockImplementation()!;
beforeEach(() => {
  jest.mocked(consentStore.read).mockImplementation(originalRead);
  jest.mocked(consentStore.replace).mockImplementation(originalReplace);
  jest.clearAllMocks();
  process.env.INTERNAL_API_TOKEN = "synthetic-internal";
});
afterEach(() => jest.restoreAllMocks());

it("prepares and previews exact recipients without creating a ticket or exposing a receipt to the tool", async () => {
  const f = fixture();
  const proposal = await f.prepare();
  expect(proposal.status).toBe("confirmation_required");
  expect(proposal.receipt).toBeUndefined();
  const preview = await f.preview(proposal.proposalId);
  expect(preview.body.payload).toMatchObject({
    ...draft,
    transcript_excerpt: null,
    customerLinked: false,
    orderVerified: false,
    supportInbox: "support@3dbytetech.com.au",
  });
  expect(preview.body.payload.customer_id).toBeUndefined();
  expect(f.module.createConfirmedAiHandoff).not.toHaveBeenCalled();
  expect(dispatchInitialTicketDeliveries).not.toHaveBeenCalled();
});
it("submits the exact preview once and rejects replay while status lookup returns the saved result", async () => {
  const f = fixture();
  const proposal = await f.prepare();
  const { body } = await f.preview(proposal.proposalId);
  expect((await f.call(confirmSupportTicket, confirmation(body))).code).toBe(
    201,
  );
  expect((await f.call(confirmSupportTicket, confirmation(body))).code).toBe(
    409,
  );
  expect((await f.preview(proposal.proposalId)).body.status).toBe("submitted");
  expect(f.module.createConfirmedAiHandoff).toHaveBeenCalledTimes(1);
  expect(f.module.createConfirmedAiHandoff).toHaveBeenCalledWith(
    expect.objectContaining({
      email: draft.email,
      message: draft.message,
      customer_id: null,
      order_id: null,
      metadata: expect.objectContaining({
        transcript_excerpt: null,
        consent_payload_digest: body.digest,
      }),
    }),
  );
  expect(dispatchInitialTicketDeliveries).toHaveBeenCalledTimes(1);
});
it.each([
  { receipt: "b".repeat(64) },
  { digest: "b".repeat(64) },
  { confirmed: false },
  { email: "changed@example.invalid" },
  { customer_id: "forged" },
  { verified_order_context: { order_id: "forged" } },
])(
  "rejects forged or changed confirmation %j without side effects",
  async (change) => {
    const f = fixture();
    const p = await f.prepare();
    const { body } = await f.preview(p.proposalId);
    expect(
      (await f.call(confirmSupportTicket, { ...confirmation(body), ...change }))
        .code,
    ).toBeGreaterThanOrEqual(400);
    expect(f.module.createConfirmedAiHandoff).not.toHaveBeenCalled();
    expect(dispatchInitialTicketDeliveries).not.toHaveBeenCalled();
  },
);
it.each([
  { confirmedByCustomer: true },
  { customer_id: "forged" },
  { order_id: "forged" },
  { metadata: {} },
  { verified_order_context: {} },
])("does not accept model-owned authority in a draft %j", async (change) => {
  const f = fixture();
  expect(
    (await f.call(prepareSupportTicket, { ...draft, ...change })).code,
  ).toBe(400);
});
it("rejects a missing receipt before any storage access", async () => {
  const f = fixture();
  expect(
    (
      await f.call(confirmSupportTicket, {
        ...draft,
        confirmedByCustomer: true,
      })
    ).code,
  ).toBe(400);
  expect(consentStore.read).not.toHaveBeenCalled();
});
it("rejects cross-session and changed-account previews and confirmations", async () => {
  const f = fixture();
  const p = await f.prepare();
  const { body } = await f.preview(p.proposalId);
  for (const other of [
    fixture("b".repeat(64)),
    fixture("a".repeat(64), "different-customer"),
  ]) {
    expect((await other.preview(p.proposalId)).code).toBe(409);
    expect(
      (await other.call(confirmSupportTicket, confirmation(body))).code,
    ).toBe(409);
    expect(other.module.createConfirmedAiHandoff).not.toHaveBeenCalled();
  }
});
it("rejects expired receipts and proposals", async () => {
  const f = fixture();
  const p = await f.prepare();
  const { body } = await f.preview(p.proposalId);
  const now = Date.now();
  jest.spyOn(Date, "now").mockReturnValue(now + 120001);
  expect((await f.call(confirmSupportTicket, confirmation(body))).code).toBe(
    409,
  );
  jest.spyOn(Date, "now").mockReturnValue(now + 600001);
  expect((await f.preview(p.proposalId)).code).toBe(409);
  expect(f.module.createConfirmedAiHandoff).not.toHaveBeenCalled();
});
it("requires a new receipt when transcript inclusion changes", async () => {
  const f = fixture();
  const p = await f.prepare();
  const first = (await f.preview(p.proposalId)).body;
  const second = (await f.preview(p.proposalId, true)).body;
  expect(second.payload.transcript_excerpt).toBe(draft.transcript_excerpt);
  expect(second.digest).not.toBe(first.digest);
  expect((await f.call(confirmSupportTicket, confirmation(first))).code).toBe(
    409,
  );
  expect((await f.call(confirmSupportTicket, confirmation(second))).code).toBe(
    201,
  );
});
it("rederives authenticated order context and rejects association or recipient configuration drift", async () => {
  const f = fixture("a".repeat(64), "synthetic-customer");
  const p = await f.prepare();
  const first = (await f.preview(p.proposalId)).body;
  expect(first.payload.orderVerified).toBe(true);
  f.graph.mockImplementation(async ({ entity }) => ({
    data: entity === "customer" ? [{ id: "synthetic-customer" }] : [],
  }));
  expect((await f.call(confirmSupportTicket, confirmation(first))).code).toBe(
    409,
  );
  expect(f.module.createConfirmedAiHandoff).not.toHaveBeenCalled();
});
it("allows only one concurrent submission", async () => {
  const f = fixture();
  const p = await f.prepare();
  const { body } = await f.preview(p.proposalId);
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      f.call(confirmSupportTicket, confirmation(body)),
    ),
  );
  expect(results.filter((result) => result.code === 201)).toHaveLength(1);
  expect(f.module.createConfirmedAiHandoff).toHaveBeenCalledTimes(1);
});
it("keeps the claim spent after a database failure and does not notify or retry", async () => {
  const f = fixture();
  const p = await f.prepare();
  const { body } = await f.preview(p.proposalId);
  f.module.createConfirmedAiHandoff.mockRejectedValueOnce(
    new Error("synthetic DB failure"),
  );
  expect((await f.call(confirmSupportTicket, confirmation(body))).code).toBe(
    503,
  );
  expect((await f.call(confirmSupportTicket, confirmation(body))).code).toBe(
    409,
  );
  expect(f.module.createConfirmedAiHandoff).toHaveBeenCalledTimes(1);
  expect(dispatchInitialTicketDeliveries).not.toHaveBeenCalled();
});
it("fails closed when consent storage is unavailable", async () => {
  const f = fixture();
  jest
    .mocked(consentStore.create)
    .mockRejectedValueOnce(new Error("unavailable"));
  expect((await f.call(prepareSupportTicket, draft)).code).toBe(503);
  expect(f.module.createConfirmedAiHandoff).not.toHaveBeenCalled();
});
it("does not let a notification failure turn a saved ticket into a second submission", async () => {
  const f = fixture();
  const p = await f.prepare();
  const { body } = await f.preview(p.proposalId);
  jest
    .mocked(dispatchInitialTicketDeliveries)
    .mockRejectedValueOnce(new Error("notification unavailable"));
  expect((await f.call(confirmSupportTicket, confirmation(body))).code).toBe(
    201,
  );
  expect((await f.call(confirmSupportTicket, confirmation(body))).code).toBe(
    409,
  );
});
it("rejects altered server snapshot payloads even with an old receipt", async () => {
  const f = fixture();
  const p = await f.prepare();
  const { body } = await f.preview(p.proposalId);
  const context = consentHash(JSON.stringify(["a".repeat(64), null]));
  const { raw, record } = await consentStore.read(p.proposalId, context);
  await consentStore.replace(p.proposalId, raw, {
    ...record,
    payload: { ...record.payload!, email: "changed@example.invalid" },
  });
  expect((await f.call(confirmSupportTicket, confirmation(body))).code).toBe(
    409,
  );
});

it("returns the saved ticket and still queues notifications when Redis completion fails", async () => {
  const f = fixture();
  const proposal = await f.prepare();
  const { body } = await f.preview(proposal.proposalId);
  const replace = originalReplace;
  jest
    .spyOn(consentStore, "replace")
    .mockImplementation(async (id, raw, record) => {
      if (record.status === "submitted")
        throw new Error("synthetic completion interruption");
      return replace(id, raw, record);
    });
  const result = await f.call(confirmSupportTicket, confirmation(body));
  expect(result.code).toBe(201);
  expect(result.body.notificationStatus).toBe("queued");
  expect(dispatchInitialTicketDeliveries).toHaveBeenCalledTimes(1);
  expect(f.module.createSupportTicketEvents).not.toHaveBeenCalled();
  expect(
    f.module.createConfirmedAiHandoff.mock.calls[0][0].metadata,
  ).toMatchObject({
    consent_context_hash: consentHash(JSON.stringify(["a".repeat(64), null])),
    consent_support_inbox: body.payload.supportInbox,
  });
});
it("recovers durable status without Redis and denies another session or account", async () => {
  const f = fixture();
  f.module.listSupportTickets.mockResolvedValue([
    {
      id: "saved",
      ticket_number: "SAVED",
      status: "new",
      metadata: {
        consent_context_hash: consentHash(
          JSON.stringify(["a".repeat(64), null]),
        ),
      },
    },
  ]);
  jest
    .spyOn(consentStore, "read")
    .mockRejectedValue(new Error("Redis unavailable"));
  expect((await f.preview("f".repeat(64))).body).toMatchObject({
    status: "submitted",
    notificationStatus: "pending",
    ticket: { id: "saved" },
  });
  expect(consentStore.read).not.toHaveBeenCalled();
  for (const other of [
    fixture("b".repeat(64)),
    fixture("a".repeat(64), "changed-account"),
  ]) {
    other.module.listSupportTickets.mockImplementation(
      f.module.listSupportTickets,
    );
    expect((await other.preview("f".repeat(64))).code).toBe(409);
  }
  expect(dispatchInitialTicketDeliveries).not.toHaveBeenCalled();
  expect(f.module.createConfirmedAiHandoff).not.toHaveBeenCalled();
});
it("reports pending email if dispatch fails or the journal remains incomplete", async () => {
  for (const stage of ["queue", "event"]) {
    const f = fixture();
    const p = await f.prepare();
    const { body } = await f.preview(p.proposalId);
    if (stage === "queue")
      jest
        .mocked(dispatchInitialTicketDeliveries)
        .mockRejectedValueOnce(new Error("synthetic"));
    else
      jest.mocked(dispatchInitialTicketDeliveries).mockResolvedValueOnce("pending");
    expect(
      (await f.call(confirmSupportTicket, confirmation(body))).body
        .notificationStatus,
    ).toBe("pending");
  }
});
