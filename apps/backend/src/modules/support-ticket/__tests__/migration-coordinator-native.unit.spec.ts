import path from "node:path";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import {
  createPgConnection,
  mikroOrmCreateConnection,
} from "@medusajs/framework/utils";

const fixtureUrl = process.env.CONSENT_TEST_POSTGRES_URL;
const suite = fixtureUrl ? describe : describe.skip;
const migrationPath = path.join(__dirname, "../migrations");
const initial = "Migration20260520000100";
const column = "Migration20261015053000";
const index = "Migration20261015053100";
const indexSql = `select i.indisvalid, i.indisready, i.indisunique from pg_index i join pg_class c on c.oid=i.indexrelid where c.relname='IDX_support_ticket_ai_consent_proposal'`;

async function database() {
  const url = new URL(fixtureUrl!);
  if (
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/postgres" ||
    url.password
  )
    throw new Error("Synthetic loopback PostgreSQL administrator required");
  const name = `coordinator_test_${Date.now()}_${randomBytes(4).toString("hex")}`;
  const admin = createPgConnection({ clientUrl: url.href });
  try {
    await admin.raw(`create database "${name}"`);
    // A regression must fail visibly instead of hanging a CI worker indefinitely.
    await admin.raw(`alter database "${name}" set statement_timeout = '8s'`);
  } finally {
    await admin.destroy();
  }
  url.pathname = `/${name}`;
  console.info(`Preserved synthetic database: ${name}`);
  return { clientUrl: url.href, schema: "public" };
}
type Database = Awaited<ReturnType<typeof database>>;

function start(db: Database, mode = "normal") {
  const events: { kind: string; at: number }[] = [];
  let release = () => {};
  const result = new Promise<{ code: number | null; output: string }>(
    (resolve, reject) => {
      const env = Object.fromEntries(
        ["PATH", "TMPDIR", "XDG_CACHE_HOME", "XDG_CONFIG_HOME"].flatMap(
          (key) => (process.env[key] ? [[key, process.env[key]!]] : []),
        ),
      );
      const child = spawn(
        process.execPath,
        [path.join(__dirname, "fixtures/migrate-app.cjs"), db.clientUrl, mode],
        {
          cwd: process.cwd(),
          env: { ...env, NODE_ENV: "test" },
          stdio: ["ignore", "pipe", "pipe", "ipc"],
        },
      );
      release = () => {
        if (child.connected) child.send("continue");
      };
      let output = "";
      child.stdout!.on("data", (data) => {
        output += data.toString();
      });
      child.stderr!.on("data", (data) => {
        output += data.toString();
      });
      child.on("message", (event: { kind: string; at: number }) =>
        events.push(event),
      );
      const timer = setTimeout(() => child.kill("SIGKILL"), 25000);
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("close", (code) => {
        clearTimeout(timer);
        resolve({ code, output });
      });
    },
  );
  return { result, events, release: () => release() };
}
function run(db: Database) {
  return start(db).result;
}
async function until(check: () => boolean | Promise<boolean>) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Synthetic migration observation timed out");
}
async function assertUnlocked(db: Database) {
  const observer = createPgConnection(db);
  try {
    expect(
      (
        await observer.raw(
          `select pid from pg_locks where locktype='advisory' and database=(select oid from pg_database where datname=current_database())`,
        )
      ).rows,
    ).toEqual([]);
    expect(
      (
        await observer.raw(
          `select pid from pg_stat_activity where datname=current_database() and state='idle in transaction'`,
        )
      ).rows,
    ).toEqual([]);
  } finally {
    await observer.destroy();
  }
}
async function inspect(
  db: Database,
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

suite("full application migration coordinator", () => {
  jest.setTimeout(45000);
  it("finishes fresh installation and repeat runs without an old coordinator snapshot", async () => {
    const db = await database();
    const first = await run(db);
    expect(first).toEqual({
      code: 0,
      output: expect.stringContaining("MIGRATION_OK"),
    });
    expect(await run(db)).toEqual({
      code: 0,
      output: expect.stringContaining("MIGRATION_OK"),
    });
    await assertUnlocked(db);
    await inspect(db, async (orm) => {
      expect(
        (await orm.getMigrator().getExecutedMigrations()).map((m) => m.name),
      ).toEqual([initial, column, index]);
      expect(await orm.em.execute(indexSql)).toEqual([
        { indisvalid: true, indisready: true, indisunique: true },
      ]);
    });
  });
  it("upgrades legacy data and enforces proposal uniqueness across soft-deleted tickets", async () => {
    const db = await database();
    await inspect(db, async (orm) => {
      await orm.getMigrator().up({ migrations: [initial] });
      await orm.em.execute(
        `insert into support_ticket(id,ticket_number,subject,customer_name,customer_email) values ('legacy','LEGACY','Synthetic','Fixture','fixture@example.invalid')`,
      );
    });
    expect(await run(db)).toEqual({
      code: 0,
      output: expect.stringContaining("MIGRATION_OK"),
    });
    expect(await run(db)).toEqual({
      code: 0,
      output: expect.stringContaining("MIGRATION_OK"),
    });
    await inspect(db, async (orm) => {
      expect(
        await orm.em.execute(
          `select ai_consent_proposal_id from support_ticket where id='legacy'`,
        ),
      ).toEqual([{ ai_consent_proposal_id: null }]);
      expect(
        (await orm.getMigrator().getExecutedMigrations()).map((m) => m.name),
      ).toEqual([initial, column, index]);
      expect(await orm.em.execute(indexSql)).toEqual([
        { indisvalid: true, indisready: true, indisunique: true },
      ]);
      await orm.em.execute(
        `insert into support_ticket(id,ticket_number,subject,customer_name,customer_email,ai_consent_proposal_id,deleted_at) values ('deleted','DELETED','Synthetic','Fixture','fixture@example.invalid','one-proposal',now())`,
      );
      await expect(
        orm.em.execute(
          `insert into support_ticket(id,ticket_number,subject,customer_name,customer_email,ai_consent_proposal_id) values ('replay','REPLAY','Synthetic','Fixture','fixture@example.invalid','one-proposal')`,
        ),
      ).rejects.toThrow(/duplicate key|unique constraint/);
      expect(
        await orm.em.execute(`select id from support_ticket order by id`),
      ).toEqual([{ id: "deleted" }, { id: "legacy" }]);
    });
    await assertUnlocked(db);
  });
  it("serializes separate processes without a waiting coordinator retaining a snapshot", async () => {
    const db = await database();
    const observer = createPgConnection(db);
    const first = start(db, "hold");
    let second: ReturnType<typeof start> | undefined;
    try {
      await until(() => first.events.some((event) => event.kind === "entered"));
      second = start(db);
      await until(
        async () =>
          (
            await observer.raw(
              `select pid from pg_stat_activity where datname=current_database() and query like 'SELECT pg_try_advisory_lock%' and state='idle' and xact_start is null`,
            )
          ).rows.length === 2,
      );
      expect(second.events).toEqual([]);
      expect(
        (
          await observer.raw(
            `select pid from pg_locks where locktype='advisory' and granted and database=(select oid from pg_database where datname=current_database())`,
          )
        ).rows,
      ).toHaveLength(1);
      first.release();
      expect(await first.result).toEqual({
        code: 0,
        output: expect.stringContaining("MIGRATION_OK"),
      });
      expect(await second.result).toEqual({
        code: 0,
        output: expect.stringContaining("MIGRATION_OK"),
      });
      expect(
        second.events.find((event) => event.kind === "entered")!.at,
      ).toBeGreaterThanOrEqual(
        first.events.filter((event) => event.kind === "leaving").pop()!.at,
      );
    } finally {
      first.release();
      second?.release();
      await Promise.all([first.result, second?.result]);
      await observer.destroy();
    }
    await assertUnlocked(db);
    await inspect(db, async (orm) => {
      expect(
        (await orm.getMigrator().getExecutedMigrations()).map((m) => m.name),
      ).toEqual([initial, column, index]);
      expect(await orm.em.execute(indexSql)).toEqual([
        { indisvalid: true, indisready: true, indisunique: true },
      ]);
    });
  });
  it("releases the session lock on migration failure and allows an ordinary retry", async () => {
    const db = await database();
    expect(await start(db, "fail").result).toEqual({
      code: 1,
      output: expect.stringContaining("Synthetic migration failure"),
    });
    await assertUnlocked(db);
    expect(await run(db)).toEqual({
      code: 0,
      output: expect.stringContaining("MIGRATION_OK"),
    });
    await assertUnlocked(db);
  });
  it("keeps an invalid index failure visible without changing rows or migration history", async () => {
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
    expect(await run(db)).toEqual({
      code: 1,
      output: expect.stringMatching(/unique index|duplicated/),
    });
    await assertUnlocked(db);
    expect(await run(db)).toEqual({
      code: 1,
      output: expect.stringContaining("already exists"),
    });
    await assertUnlocked(db);
    await inspect(db, async (orm) => {
      expect(
        (await orm.getMigrator().getExecutedMigrations()).map((m) => m.name),
      ).toEqual([initial, column]);
      expect(await orm.em.execute(indexSql)).toEqual([
        { indisvalid: false, indisready: false, indisunique: true },
      ]);
      expect(
        await orm.em.execute(`select id from support_ticket order by id`),
      ).toEqual([{ id: "one" }, { id: "two" }]);
    });
  });
  it("retains the upstream transaction advisory lock when the module does not opt in", async () => {
    const db = await database();
    const observer = createPgConnection(db);
    const migration = start(db, "transaction");
    try {
      await until(() =>
        migration.events.some((event) => event.kind === "entered"),
      );
      expect(
        (
          await observer.raw(
            `select pid from pg_stat_activity where datname=current_database() and query like 'SELECT pg_advisory_xact_lock%' and state='idle in transaction'`,
          )
        ).rows,
      ).toHaveLength(1);
      migration.release();
      expect(await migration.result).toEqual({
        code: 0,
        output: expect.stringContaining("MIGRATION_OK"),
      });
    } finally {
      migration.release();
      await migration.result;
      await observer.destroy();
    }
    await assertUnlocked(db);
  });
});
