import { DeliveryConflict } from "../../../../../../lib/support-tickets/delivery-state";
import { dispatchTicketDelivery } from "../../../../../../lib/support-tickets/delivery";
jest.mock("../../../../../../lib/support-tickets/delivery", () => ({
  deliveryViews: jest.fn(async () => []),
  dispatchTicketDelivery: jest.fn(async () => undefined),
}));
import { POST } from "../route";
const service = {
  listSupportTickets: jest.fn(),
  transitionDelivery: jest.fn(),
};
const user = { retrieveUser: jest.fn(async () => ({ id: "admin" })) };
const request = (changes = {}) => ({
  auth_context: { actor_id: "admin", actor_type: "user" },
  headers: {
    origin: "https://admin.example",
    "content-type": "application/json",
  },
  params: { id: "ticket" },
  body: {
    action: "reconcile",
    kind: "internal",
    expectedVersion: 2,
    confirmed: true,
    outcome: "not_accepted",
    senderStopped: true,
    evidence: "Provider case confirms no acceptance",
    providerReference: "case-123",
  },
  scope: {
    resolve: jest.fn((name: string) => (name === "user" ? user : service)),
  },
  ...changes,
});
const response = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});
beforeEach(() => {
  jest.clearAllMocks();
  process.env.ADMIN_CORS = "https://admin.example";
  service.listSupportTickets.mockResolvedValue([
    { id: "ticket", source: "ai_chat" },
  ]);
});
it.each([
  { auth_context: undefined },
  { auth_context: { actor_id: "customer", actor_type: "customer" } },
])(
  "rejects a missing or customer identity before reading tickets",
  async (changes) => {
    const req = request(changes),
      res = response();
    await POST(req as never, res as never);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(service.listSupportTickets).not.toHaveBeenCalled();
  },
);
it("rejects cross-origin session mutations", async () => {
  const res = response();
  await POST(
    request({
      headers: {
        origin: "https://evil.example",
        "content-type": "application/json",
      },
    }) as never,
    res as never,
  );
  expect(res.status).toHaveBeenCalledWith(403);
  expect(service.listSupportTickets).not.toHaveBeenCalled();
});
it("rejects forged actor and recipient fields", async () => {
  const req = request();
  req.body = {
    ...req.body,
    actor_id: "forged",
    recipient: "evil@example.invalid",
  } as never;
  const res = response();
  await POST(req as never, res as never);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(service.transitionDelivery).not.toHaveBeenCalled();
});
it("rejects a deleted or revoked admin session", async () => {
  user.retrieveUser.mockRejectedValueOnce(new Error("gone"));
  const res = response();
  await POST(request() as never, res as never);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(service.listSupportTickets).not.toHaveBeenCalled();
});

it("attributes reconciliation to the verified actor and sends no email", async () => {
  const req = request(),
    res = response();
  await POST(req as never, res as never);
  expect(service.transitionDelivery).toHaveBeenCalledWith(
    "ticket",
    "internal",
    expect.objectContaining({ actorId: "admin", outcome: "not_accepted" }),
  );
  expect(dispatchTicketDelivery).not.toHaveBeenCalled();
});
it("allows a separately authenticated bearer client without an Origin", async () => {
  const req = request({
      headers: {
        authorization: "Bearer synthetic-token",
        "content-type": "application/json",
      },
    }),
    res = response();
  await POST(req as never, res as never);
  expect(res.json).toHaveBeenCalledWith({ deliveries: [] });
});
it("rejects session mutation without Origin", async () => {
  const res = response();
  await POST(
    request({ headers: { "content-type": "application/json" } }) as never,
    res as never,
  );
  expect(res.status).toHaveBeenCalledWith(403);
});
it("rejects non-JSON and unconfirmed send actions", async () => {
  for (const changes of [
    {
      headers: {
        origin: "https://admin.example",
        "content-type": "text/plain",
      },
    },
    {
      body: {
        action: "send",
        kind: "customer",
        expectedVersion: 0,
        confirmed: false,
      },
    },
  ]) {
    const res = response();
    await POST(request(changes) as never, res as never);
    expect(res.status.mock.calls[0][0]).toBeGreaterThanOrEqual(400);
  }
  expect(dispatchTicketDelivery).not.toHaveBeenCalled();
});
it("returns safe errors on stale or unavailable persistence without leaking internals", async () => {
  for (const error of [
    new DeliveryConflict("stale"),
    new Error("private-database-secret"),
  ]) {
    service.transitionDelivery.mockRejectedValueOnce(error);
    const res = response();
    await POST(request() as never, res as never);
    expect(res.status).toHaveBeenCalledWith(
      error instanceof DeliveryConflict ? 409 : 503,
    );
    expect(JSON.stringify(res.json.mock.calls)).not.toContain(
      "private-database-secret",
    );
  }
});
