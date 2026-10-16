import path from "node:path";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { createPgConnection } from "@medusajs/framework/utils";

const fromFramework = createRequire(
  require.resolve("@medusajs/framework/modules-sdk"),
);
const sdk = path.dirname(fromFramework.resolve("@medusajs/modules-sdk"));
const { withSessionMigrationLock } = require(
  path.join(sdk, "utils/session-migration-lock"),
) as {
  withSessionMigrationLock: (
    knex: ReturnType<typeof createPgConnection>,
    key: string,
    migrate: () => Promise<void>,
  ) => Promise<void>;
};
const fixtureUrl = process.env.CONSENT_TEST_POSTGRES_URL;
const suite = fixtureUrl ? describe : describe.skip;
const key = "db-module-migration:supportTicket";

suite("session migration lock total timeout on PostgreSQL", () => {
  jest.setTimeout(10000);
  it.each([
    { lock: 150, statement: 0, code: "55P03", reason: "lock_timeout" },
    { lock: 0, statement: 150, code: "57014", reason: "statement_timeout" },
    { lock: 150, statement: 150, code: "57014", reason: "statement_timeout" },
  ])(
    "honors $reason while the original owner remains connected ($lock/$statement ms)",
    async ({ lock, statement, code, reason }) => {
      const url = new URL(fixtureUrl!);
      if (
        url.hostname !== "127.0.0.1" ||
        url.pathname !== "/postgres" ||
        url.password
      )
        throw new Error("Synthetic loopback PostgreSQL administrator required");
      const name = `coordinator_timeout_${Date.now()}_${randomBytes(4).toString("hex")}`;
      const admin = createPgConnection({ clientUrl: url.href });
      try {
        await admin.raw(`create database "${name}"`);
        await admin.raw(
          `alter database "${name}" set lock_timeout = '${lock}ms'`,
        );
        await admin.raw(
          `alter database "${name}" set statement_timeout = '${statement}ms'`,
        );
      } finally {
        await admin.destroy();
      }
      console.info(`Preserved synthetic database: ${name}`);
      url.pathname = `/${name}`;
      const owner = createPgConnection({
        clientUrl: url.href,
        pool: { min: 0, max: 1 },
      });
      const waiter = createPgConnection({
        clientUrl: url.href,
        pool: { min: 0, max: 1 },
      });
      const connection = await owner.client.acquireConnection();
      const migrate = jest.fn(async () => {});
      let running: Promise<void> | undefined;
      let outcome:
        | { code?: string; message: string; elapsed: number }
        | undefined;
      try {
        await owner
          .raw("SELECT pg_advisory_lock(hashtext(?))", [key])
          .connection(connection);
        const begin = performance.now();
        running = withSessionMigrationLock(waiter, key, migrate).then(
          () => {
            outcome = {
              message: "unexpected success",
              elapsed: performance.now() - begin,
            };
          },
          (error: Error & { code?: string }) => {
            outcome = {
              code: error.code,
              message: error.message,
              elapsed: performance.now() - begin,
            };
          },
        );
        // The owner stays connected and holds its lock throughout this observation.
        await Promise.race([
          running,
          new Promise((resolve) => setTimeout(resolve, 750)),
        ]);
        expect(outcome).toMatchObject({
          code,
          message: expect.stringContaining(reason),
        });
        expect(outcome!.elapsed).toBeGreaterThanOrEqual(140);
        expect(outcome!.elapsed).toBeLessThan(700);
        expect(migrate).not.toHaveBeenCalled();
        expect(
          (
            await owner
              .raw(
                "select count(*)::int as count from pg_locks where locktype='advisory' and database=(select oid from pg_database where datname=current_database())",
              )
              .connection(connection)
          ).rows,
        ).toEqual([{ count: 1 }]);
        expect(
          (
            await owner
              .raw(
                "select pid from pg_stat_activity where datname=current_database() and pid<>pg_backend_pid()",
              )
              .connection(connection)
          ).rows,
        ).toEqual([]);
        console.info(JSON.stringify({ lock, statement, ...outcome }));
      } finally {
        await owner
          .raw("SELECT pg_advisory_unlock(hashtext(?))", [key])
          .connection(connection);
        await running;
        await owner.client.releaseConnection(connection);
        await owner.destroy();
        // Idempotent cleanup also covers a setup failure before the helper starts.
        await waiter.destroy();
      }
    },
  );
});
