import path from "node:path";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { MedusaApp, MedusaModule } from "@medusajs/framework/modules-sdk";
import { createPgConnection } from "@medusajs/framework/utils";
import type { MedusaRequest } from "@medusajs/framework/http";
import type { SupportTicketModule } from "../../../api/support-ticket-utils";
import type { SupportTicketRecord } from "../../../lib/support-tickets/types";
import {
  dispatchTicketDelivery,
  dispatchInitialTicketDeliveries,
  readTicketDeliveries,
  deliveryViews,
} from "../../../lib/support-tickets/delivery";
import {
  DELIVERY_EVENT,
  publicDelivery,
} from "../../../lib/support-tickets/delivery-state";
import { state } from "./fixtures/delivery-provider";
import { GET as detail } from "../../../api/admin/support-tickets/[id]/route";

const fixture = process.env.CONSENT_TEST_POSTGRES_URL;
const suite = fixture ? describe : describe.skip;
// New synthetic databases only. No reset, delete, live provider or runtime secrets.
async function database(label: string) {
  const url = new URL(fixture!);
  if (
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/postgres" ||
    url.password
  )
    throw new Error("Isolated PostgreSQL required");
  const name = `delivery_${label}_${Date.now()}_${randomBytes(3).toString("hex")}`;
  const pg = createPgConnection({ clientUrl: url.href });
  try {
    await pg.raw(`create database "${name}"`);
  } finally {
    await pg.destroy();
  }
  url.pathname = `/${name}`;
  console.info("Preserved synthetic database:", name);
  return { clientUrl: url.href, schema: "public" };
}
type NativeNotification = {
  createNotifications: (input: Record<string, unknown>) => Promise<unknown>;
  listNotifications: (input: Record<string, unknown>) => Promise<
    Array<{
      id: string;
      status: string;
      to: string;
      external_id: string;
      idempotency_key: string;
    }>
  >;
  notificationService_: { update: (...args: unknown[]) => Promise<unknown> };
};
suite("durable AI ticket notification journal with native modules", () => {
  jest.setTimeout(90000);
  let app: Awaited<ReturnType<typeof MedusaApp>>,
    service: SupportTicketModule,
    notification: NativeNotification,
    req: MedusaRequest;
  async function create(label = "Synthetic") {
    return service.createConfirmedAiHandoff({
      name: "Fixture",
      email: "customer@example.invalid",
      subject: label,
      message: "Synthetic notification request",
      source: "ai_chat",
      category: "general",
      priority: "normal",
      consent_proposal_id: randomBytes(32).toString("hex"),
      metadata: {
        consent_support_inbox: "confirmed@example.invalid",
        consent_context_hash: "synthetic",
      },
    } as never);
  }
  const records = (ticket: SupportTicketRecord) =>
    readTicketDeliveries(req, ticket);
  const advance = () =>
    jest.spyOn(Date, "now").mockReturnValue(Date.now() + 180000);
  beforeAll(async () => {
    const supportPath = path.join(process.cwd(), "src/modules/support-ticket");
    const notificationPath = path.dirname(
      createRequire(require.resolve("@medusajs/medusa/package.json")).resolve(
        "@medusajs/notification/package.json",
      ),
    );
    const supportDb = await database("support"),
      notificationDb = await database("notification");
    await MedusaModule.migrateUp({
      moduleKey: "supportTicket",
      modulePath: supportPath,
      options: { database: supportDb },
    });
    await MedusaModule.migrateUp({
      moduleKey: "notification",
      modulePath: notificationPath,
      options: { database: notificationDb },
    });
    app = await MedusaApp({
      modulesConfig: {
        supportTicket: {
          resolve: supportPath,
          options: { database: supportDb },
        },
        notification: {
          resolve: notificationPath,
          options: {
            database: notificationDb,
            providers: [
              {
                resolve: path.join(__dirname, "fixtures/delivery-provider.ts"),
                id: "synthetic-reconciliation",
                options: { channels: ["email"] },
              },
            ],
          },
        },
      },
    });
    service = app.modules.supportTicket as unknown as SupportTicketModule;
    notification = app.modules.notification as unknown as NativeNotification;
    req = {
      scope: {
        resolve: (name: string) =>
          name === "supportTicket"
            ? service
            : name === "notification"
              ? notification
              : name === "emailSettings"
                ? {
                    getResolvedSenderProfile: async () => ({
                      from: "Synthetic <sender@example.invalid>",
                      reply_to: "confirmed@example.invalid",
                    }),
                  }
                : { warn: jest.fn() },
      },
    } as unknown as MedusaRequest;
  });
  beforeEach(() => {
    state.calls.length = 0;
    state.failInternal = false;
    state.acceptThenThrow = false;
    process.env.EMAIL_ASSET_BASE_URL = "https://assets.example.invalid";
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    if (app) {
      await app.onApplicationPrepareShutdown();
      await app.onApplicationShutdown();
      MedusaModule.clearInstances();
    }
  });
  it("commits both pending intents with the ticket and exposes them in Admin before sending", async () => {
    const ticket = await create();
    expect((await records(ticket)).map((r) => r.status)).toEqual([
      "pending",
      "pending",
    ]);
    expect(state.calls).toHaveLength(0);
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await detail({ ...req, params: { id: ticket.id } } as never, res as never);
    expect(
      res.json.mock.calls[0][0].deliveries.map(
        (r: { status: string }) => r.status,
      ),
    ).toEqual(["pending", "pending"]);
    expect(await dispatchInitialTicketDeliveries(req, ticket)).toBe("queued");
    expect((await records(ticket)).map((r) => r.status)).toEqual([
      "sent",
      "sent",
    ]);
    await dispatchInitialTicketDeliveries(req, ticket);
    expect(state.calls).toHaveLength(2);
  });
  it("serializes concurrent claims and never sends again on a stale replay", async () => {
    const ticket = await create();
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () =>
        dispatchTicketDelivery(req, ticket, "customer", 0, null),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(state.calls).toHaveLength(1);
    await expect(
      dispatchTicketDelivery(req, ticket, "customer", 0, "admin"),
    ).rejects.toThrow();
    expect(state.calls).toHaveLength(1);
  });
  it("keeps a crash before dispatch blocked until a fenced reconciliation invalidates the old worker", async () => {
    const ticket = await create();
    const claim = await service.transitionDelivery(ticket.id, "customer", {
      action: "claim",
      expectedVersion: 0,
      payload: { to: "customer@example.invalid", channel: "email" },
      actorId: null,
    });
    advance();
    expect(publicDelivery(claim).status).toBe("unknown");
    const failed = await service.transitionDelivery(ticket.id, "customer", {
      action: "reconcile",
      expectedVersion: claim.version,
      actorId: "admin",
      outcome: "not_accepted",
      evidence: "Stopped sending process; provider confirms no acceptance",
      providerReference: "case-1",
      senderStopped: true,
    });
    await expect(
      service.transitionDelivery(ticket.id, "customer", {
        action: "begin",
        expectedVersion: claim.version,
      }),
    ).rejects.toThrow();
    expect(state.calls).toHaveLength(0);
    expect(failed.status).toBe("failed");
  });
  it("preserves unknown after provider acceptance and a native notification persistence failure", async () => {
    const ticket = await create();
    jest
      .spyOn(notification.notificationService_, "update")
      .mockRejectedValueOnce(
        new Error("Synthetic persistence failure after provider acceptance"),
      );
    await dispatchTicketDelivery(req, ticket, "customer", 0, null);
    expect(state.calls).toHaveLength(1);
    expect(state.calls[0].accepted).toBe(true);
    const r = (await records(ticket))[0];
    expect(r.status).toBe("unknown");
    await expect(
      dispatchTicketDelivery(req, ticket, "customer", r.version, "admin"),
    ).rejects.toThrow();
    expect(state.calls).toHaveLength(1);
    expect(
      (await notification.listNotifications({ idempotency_key: r.key }))[0]
        .status,
    ).toBe("pending");
  });
  it("preserves unknown after a successful native result when the journal completion commit fails", async () => {
    const ticket = await create();
    const original = service.transitionDelivery.bind(service);
    jest
      .spyOn(service, "transitionDelivery")
      .mockImplementation(async (id, kind, command) => {
        if (command.action === "sent")
          throw new Error("Synthetic journal commit failure");
        return original(id, kind, command);
      });
    await dispatchTicketDelivery(req, ticket, "customer", 0, null);
    const r = (await records(ticket))[0];
    expect(r.status).toBe("unknown");
    expect(state.calls).toHaveLength(1);
    const [native] = await notification.listNotifications({
      idempotency_key: r.key,
    });
    expect(native.status).toBe("success");
    advance();
    await service.transitionDelivery(ticket.id, "customer", {
      action: "reconcile",
      expectedVersion: r.version,
      actorId: "admin",
      outcome: "accepted",
      evidence: "Provider ledger verified the original accepted message",
      providerReference: native.external_id,
      senderStopped: false,
    });
    expect((await records(ticket))[0].status).toBe("sent");
    expect(state.calls).toHaveLength(1);
  });
  it("requires manual non-acceptance proof and uses a new native attempt key without replaying the failed row", async () => {
    const ticket = await create();
    state.failInternal = true;
    await dispatchInitialTicketDeliveries(req, ticket);
    const r = (await records(ticket))[1];
    expect(r.status).toBe("unknown");
    await expect(
      dispatchTicketDelivery(req, ticket, "internal", r.version, "admin"),
    ).rejects.toThrow();
    advance();
    const command = {
      action: "reconcile" as const,
      expectedVersion: r.version,
      actorId: "admin",
      outcome: "not_accepted" as const,
      evidence: "Provider confirmed rejection and original sender has stopped",
      providerReference: "case-123",
      senderStopped: true,
    };
    const races = await Promise.allSettled([
      service.transitionDelivery(ticket.id, "internal", command),
      service.transitionDelivery(ticket.id, "internal", command),
    ]);
    expect(races.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    const failed = (await records(ticket))[1];
    state.failInternal = false;
    process.env.SUPPORT_TICKET_INBOX_EMAIL = "changed@example.invalid";
    await dispatchTicketDelivery(
      req,
      ticket,
      "internal",
      failed.version,
      "admin",
    );
    const sent = (await records(ticket))[1];
    expect(sent.status).toBe("sent");
    expect(sent.key).not.toBe(r.key);
    expect(sent.recipient).toBe("confirmed@example.invalid");
    expect(
      (await notification.listNotifications({ idempotency_key: r.key }))[0]
        .status,
    ).toBe("failure");
    expect(
      (await notification.listNotifications({ idempotency_key: sent.key }))[0]
        .status,
    ).toBe("success");
    expect(
      state.calls.filter((x) => x.to === "customer@example.invalid"),
    ).toHaveLength(1);
  });
  it("never interprets a provider timeout as confirmed non-acceptance", async () => {
    const ticket = await create();
    state.acceptThenThrow = true;
    await dispatchTicketDelivery(req, ticket, "customer", 0, null);
    const r = (await records(ticket))[0];
    expect(r.status).toBe("unknown");
    expect(state.calls[0].accepted).toBe(true);
    advance();
    await service.transitionDelivery(ticket.id, "customer", {
      action: "reconcile",
      expectedVersion: r.version,
      actorId: "admin",
      outcome: "unresolved",
      evidence: "Provider outcome remains uncertain; do not resend",
      providerReference: "case-unknown",
      senderStopped: false,
    });
    expect((await deliveryViews(req, ticket))[0].canSend).toBe(false);
  });
  it("rolls back the ticket and first message if persisting an intent fails", async () => {
    const original = service.createSupportTicketEvents.bind(service);
    jest
      .spyOn(service, "createSupportTicketEvents")
      .mockImplementation(async (payload, ...args) => {
        if (payload.type === DELIVERY_EVENT)
          throw new Error("Synthetic intent failure");
        return original(payload, ...args);
      });
    await expect(create("must-rollback")).rejects.toThrow();
    expect(
      await service.listSupportTickets({ subject: "must-rollback" }),
    ).toHaveLength(0);
    expect(state.calls).toHaveLength(0);
  });
  it("keeps legacy confirmed tickets unknown until explicit reconciliation and does not trust old queue flags", async () => {
    const ticket = await service.createSupportTickets({
      ticket_number: "LEGACY-" + randomBytes(4).toString("hex"),
      subject: "Legacy",
      customer_name: "Fixture",
      customer_email: "customer@example.invalid",
      source: "ai_chat",
      ai_consent_proposal_id: randomBytes(32).toString("hex"),
      metadata: { consent_support_inbox: "confirmed@example.invalid" },
    });
    await service.createSupportTicketEvents({
      ticket_id: ticket.id,
      type: "ai_handoff_notifications_queued",
    });
    expect((await deliveryViews(req, ticket)).map((r) => r.status)).toEqual([
      "unknown",
      "unknown",
    ]);
    expect(await dispatchInitialTicketDeliveries(req, ticket)).toBe("pending");
    await service.transitionDelivery(ticket.id, "customer", {
      action: "reconcile",
      expectedVersion: 0,
      actorId: "admin",
      outcome: "accepted",
      evidence:
        "Provider ledger confirms the original legacy email was accepted",
      providerReference: "legacy-provider-message",
      senderStopped: false,
    });
    expect((await records(ticket))[0].status).toBe("sent");
    expect(state.calls).toHaveLength(0);
  });
  it("blocks legacy recovery when the confirmed inbox is unavailable", async () => {
    const ticket = await service.createSupportTickets({
      ticket_number: "MISSING-" + randomBytes(4).toString("hex"),
      subject: "Legacy",
      customer_name: "Fixture",
      customer_email: "customer@example.invalid",
      source: "ai_chat",
      ai_consent_proposal_id: randomBytes(32).toString("hex"),
    });
    expect((await deliveryViews(req, ticket))[1]).toMatchObject({
      recipient: null,
      canSend: false,
      canReconcile: false,
    });
    await expect(
      service.transitionDelivery(ticket.id, "internal", {
        action: "reconcile",
        expectedVersion: 0,
        actorId: "admin",
        outcome: "not_accepted",
        evidence: "A caller cannot substitute a new inbox during recovery",
        providerReference: "case-missing",
        senderStopped: true,
      }),
    ).rejects.toThrow();
    expect(state.calls).toHaveLength(0);
  });
  it("sends only the immutable original recipient and strips consent metadata from provider payloads", async () => {
    const ticket = await create();
    const changed = await service.updateSupportTickets({
      id: ticket.id,
      customer_email: "changed@example.invalid",
    });
    const spy = jest.spyOn(notification, "createNotifications");
    await dispatchTicketDelivery(req, changed, "customer", 0, "admin");
    expect(state.calls[0].to).toBe("customer@example.invalid");
    expect(JSON.stringify(spy.mock.calls)).not.toMatch(
      /consent_context_hash|ai_consent_proposal_id|consent_payload_digest/,
    );
  });
});
