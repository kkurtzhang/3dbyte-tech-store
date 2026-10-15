import path from "node:path";
import { randomBytes } from "node:crypto";
import { MedusaApp, MedusaModule } from "@medusajs/framework/modules-sdk";
import {
  createPgConnection,
  mikroOrmCreateConnection,
} from "@medusajs/framework/utils";
import SupportTicketModuleService from "../service";
import {
  prepareSupportTicket,
  previewSupportTicket,
  confirmSupportTicket,
} from "../../../lib/support-tickets/consent-handlers";
import {
  consentStore,
  consentHash,
} from "../../../lib/support-tickets/consent-store";
import { sendSupportTicketCreatedNotifications } from "../../../lib/support-tickets/notifications";

jest.mock("../../../lib/support-tickets/notifications", () => ({
  sendSupportTicketCreatedNotifications: jest.fn(async () => undefined),
}));
const fixtureUrl = process.env.CONSENT_TEST_POSTGRES_URL;
const suite = fixtureUrl ? describe : describe.skip;
const modulePath = path.join(process.cwd(), "src/modules/support-ticket");
const migrationPath = path.join(modulePath, "migrations");
const initial = "Migration20260520000100";
const column = "Migration20261015053000";
const index = "Migration20261015053100";
const migrations = [initial, column, index];
const indexSql = `select i.indisvalid, i.indisunique from pg_index i join pg_class c on c.oid=i.indexrelid where c.relname='IDX_support_ticket_ai_consent_proposal'`;
// Explicit isolated fixture only. Each test creates a new database; no data is
// cleared/dropped and no existing database/schema or notification provider is used.
async function database() {
  const url = new URL(fixtureUrl!);
  if (
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/postgres" ||
    url.password
  )
    throw new Error("Loopback synthetic PostgreSQL administrator required");
  const name = `consent_test_${Date.now()}_${randomBytes(4).toString("hex")}`;
  const admin = createPgConnection({ clientUrl: url.href });
  try {
    await admin.raw(`create database "${name}"`);
  } finally {
    await admin.destroy();
  }
  url.pathname = `/${name}`;
  console.info(`Preserved synthetic database: ${name}`);
  return { clientUrl: url.href, schema: "public" };
}
async function run(db: Awaited<ReturnType<typeof database>>) {
  return MedusaModule.migrateUp({
    moduleKey: "supportTicket",
    modulePath,
    options: { database: db },
  });
}
async function inspect(
  db: Awaited<ReturnType<typeof database>>,
  fn: (
    orm: Awaited<ReturnType<typeof mikroOrmCreateConnection>>,
  ) => Promise<void>,
) {
  const orm = await mikroOrmCreateConnection(
    { ...db, snapshot: false },
    [],
    migrationPath,
  );
  try {
    await fn(orm);
  } finally {
    await orm.close(true);
  }
}
suite("native support consent reliability", () => {
  jest.setTimeout(90000);
  afterEach(() => jest.restoreAllMocks());
  it("migrates a fresh database through the module entrypoint and reruns without DDL", async () => {
    const db = await database();
    expect((await run(db)).map((m) => m.name)).toEqual(migrations);
    expect(await run(db)).toEqual([]);
    await inspect(db, async (orm) => {
      expect(await orm.em.execute(indexSql)).toEqual([
        { indisvalid: true, indisunique: true },
      ]);
      expect(
        (await orm.getMigrator().getExecutedMigrations()).map((m) => m.name),
      ).toEqual(migrations);
    });
  });
  it("upgrades a committed baseline and preserves legacy rows", async () => {
    const db = await database();
    await inspect(db, async (orm) => {
      await orm.getMigrator().up({ migrations: [initial] });
      await orm.em.execute(
        `insert into support_ticket(id,ticket_number,subject,customer_name,customer_email) values ('legacy','LEGACY','Synthetic','Fixture','fixture@example.invalid')`,
      );
    });
    expect((await run(db)).map((m) => m.name)).toEqual([column, index]);
    expect(await run(db)).toEqual([]);
    await inspect(db, async (orm) => {
      expect(await orm.em.execute(indexSql)).toEqual([
        { indisvalid: true, indisunique: true },
      ]);
      expect(
        await orm.em.execute(
          `select ai_consent_proposal_id from support_ticket where id='legacy'`,
        ),
      ).toEqual([{ ai_consent_proposal_id: null }]);
    });
  });
  it("preserves earlier migrations and fails visibly on a failed concurrent index and its rerun", async () => {
    const db = await database();
    await inspect(db, async (orm) => {
      await orm.getMigrator().up({ migrations: [initial] });
      await orm.getMigrator().up({ migrations: [column] });
      for (const id of ["one", "two"])
        await orm.em.execute(
          `insert into support_ticket(id,ticket_number,subject,customer_name,customer_email,ai_consent_proposal_id) values (?,?,'Synthetic','Fixture','fixture@example.invalid','duplicate')`,
          [id, id],
        );
    });
    await expect(run(db)).rejects.toThrow(/unique index|duplicated/);
    await expect(run(db)).rejects.toThrow(/already exists/);
    await inspect(db, async (orm) => {
      expect(
        (await orm.getMigrator().getExecutedMigrations()).map((m) => m.name),
      ).toEqual([initial, column]);
      expect(await orm.em.execute(indexSql)).toEqual([
        { indisvalid: false, indisunique: true },
      ]);
      expect(
        await orm.em.execute(`select id from support_ticket order by id`),
      ).toHaveLength(2);
    });
  });
  it("recovers a native committed ticket despite Redis completion failure, without replay or cross-context status", async () => {
    const redis = new URL(process.env.REDIS_URL || "http://invalid");
    if (redis.hostname !== "127.0.0.1" || redis.protocol !== "redis:")
      throw new Error("Isolated loopback Redis required");
    process.env.INTERNAL_API_TOKEN = "synthetic-consent-test";
    const db = await database();
    await run(db);
    const app = await MedusaApp({
      modulesConfig: {
        supportTicket: { resolve: modulePath, options: { database: db } },
      },
    });
    const service = app.modules
      .supportTicket as unknown as SupportTicketModuleService;
    const session = "f".repeat(64);
    async function invoke(
      handler: typeof prepareSupportTicket,
      body: unknown,
      context = session,
    ) {
      const req = {
        body,
        headers: {
          "x-3db-internal-token": "synthetic-consent-test",
          "x-3db-assistant-session": context,
        },
        scope: {
          resolve: (name: string) =>
            name === "supportTicket" ? service : { warn: jest.fn() },
        },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await handler(req as never, res as never);
      return {
        status: res.status.mock.calls[0]?.[0] ?? 200,
        body: res.json.mock.calls[0][0],
      };
    }
    try {
      const p = (
        await invoke(prepareSupportTicket, {
          name: "Fixture",
          email: "fixture@example.invalid",
          subject: "Synthetic",
          message: "Synthetic request",
        })
      ).body;
      const preview = (
        await invoke(previewSupportTicket, { proposalId: p.proposalId })
      ).body;
      const replace = consentStore.replace.bind(consentStore);
      jest
        .spyOn(consentStore, "replace")
        .mockImplementation(async (id, raw, record) => {
          if (record.status === "submitted")
            throw new Error("synthetic completion failure");
          return replace(id, raw, record);
        });
      const body = {
        proposalId: p.proposalId,
        receipt: preview.receipt,
        digest: preview.digest,
        confirmed: true,
      };
      const results = await Promise.all(
        Array.from({ length: 12 }, () => invoke(confirmSupportTicket, body)),
      );
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(results.filter((r) => r.status === 409)).toHaveLength(11);
      expect(await service.listSupportTickets({})).toHaveLength(1);
      expect(await service.listSupportTicketMessages({})).toHaveLength(1);
      expect(
        await service.listSupportTicketEvents({ type: "ai_handoff_confirmed" }),
      ).toHaveLength(1);
      expect(sendSupportTicketCreatedNotifications).toHaveBeenCalledTimes(1);
      jest
        .spyOn(consentStore, "read")
        .mockRejectedValue(new Error("Redis unavailable"));
      expect(
        (await invoke(previewSupportTicket, { proposalId: p.proposalId })).body,
      ).toMatchObject({ status: "submitted", notificationStatus: "queued" });
      expect(
        (
          await invoke(
            previewSupportTicket,
            { proposalId: p.proposalId },
            "b".repeat(64),
          )
        ).status,
      ).toBe(409);
      const ticket = (await service.listSupportTickets({}))[0];
      const persistedInput = {
        name: "Fixture",
        email: "fixture@example.invalid",
        subject: "Synthetic",
        message: "Synthetic",
        source: "ai_chat",
        category: "general",
        priority: "normal",
        consent_proposal_id: p.proposalId,
        metadata: ticket.metadata,
      };
      await expect(
        service.createConfirmedAiHandoff(persistedInput as never),
      ).rejects.toThrow();
      const failedId = randomBytes(32).toString("hex");
      await expect(
        service.createConfirmedAiHandoff({
          ...persistedInput,
          consent_proposal_id: failedId,
          message: null,
        } as never),
      ).rejects.toThrow();
      expect(
        await service.listSupportTickets({ ai_consent_proposal_id: failedId }),
      ).toHaveLength(0);
      // A process crash before queuing is represented by a durable commit with
      // no acknowledgement event. Reading it never attempts a notification.
      const crashId = randomBytes(32).toString("hex");
      await service.createConfirmedAiHandoff({
        ...persistedInput,
        consent_proposal_id: crashId,
        metadata: {
          consent_context_hash: consentHash(JSON.stringify([session, null])),
        },
      } as never);
      expect(
        (await invoke(previewSupportTicket, { proposalId: crashId })).body,
      ).toMatchObject({ status: "submitted", notificationStatus: "pending" });
      expect(sendSupportTicketCreatedNotifications).toHaveBeenCalledTimes(1);
    } finally {
      await app.onApplicationPrepareShutdown();
      await app.onApplicationShutdown();
      MedusaModule.clearInstances();
    }
  });
});
