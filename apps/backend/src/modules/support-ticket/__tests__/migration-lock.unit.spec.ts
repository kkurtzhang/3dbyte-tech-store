import path from "node:path";
import { createRequire } from "node:module";
import type { createPgConnection } from "@medusajs/framework/utils";

// Test the exact installed pnpm patch, not a second implementation in app code.
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
    migrate: () => Promise<unknown>,
  ) => Promise<unknown>;
};
const key = "db-module-migration:supportTicket";
function fixture() {
  const connection = {};
  const query = jest.fn(async (sql: string) => ({
    rows: [
      sql.includes("try_advisory") ? { acquired: true } : { released: true },
    ],
  }));
  const knex = {
    client: {
      acquireConnection: jest.fn(async () => connection),
      releaseConnection: jest.fn(async () => undefined),
    },
    raw: jest.fn((sql: string, bindings: string[]) => ({
      connection: jest.fn(async (conn: unknown) => {
        expect(conn).toBe(connection);
        expect(bindings).toEqual([key]);
        return query(sql);
      }),
    })),
    destroy: jest.fn(async () => undefined),
  };
  const migrate = jest.fn(async () => ["migration"]);
  const run = () =>
    withSessionMigrationLock(
      knex as unknown as ReturnType<typeof createPgConnection>,
      key,
      migrate,
    );
  return { knex, query, migrate, run, connection };
}
describe("session migration coordinator lock lifecycle", () => {
  it("holds the same physical session through migration and releases it before closing its private pool", async () => {
    const f = fixture();
    expect(await f.run()).toEqual(["migration"]);
    expect(f.knex.raw.mock.calls.map(([sql]) => sql)).toEqual([
      "SELECT pg_try_advisory_lock(hashtext(?)) AS acquired",
      "SELECT pg_advisory_unlock(hashtext(?)) AS released",
    ]);
    expect(f.knex.client.releaseConnection).toHaveBeenCalledWith(f.connection);
    expect(f.knex.destroy).toHaveBeenCalledTimes(1);
    expect(f.migrate.mock.invocationCallOrder[0]).toBeLessThan(
      f.knex.client.releaseConnection.mock.invocationCallOrder[0],
    );
    expect(
      f.knex.client.releaseConnection.mock.invocationCallOrder[0],
    ).toBeLessThan(f.knex.destroy.mock.invocationCallOrder[0]);
  });
  it("retries contention without beginning a transaction or running the migration early", async () => {
    const f = fixture();
    f.query.mockImplementationOnce(async () => {
      expect(f.migrate).not.toHaveBeenCalled();
      return { rows: [{ acquired: false }] };
    });
    await f.run();
    expect(f.query).toHaveBeenCalledTimes(3);
    expect(f.migrate).toHaveBeenCalledTimes(1);
  });
  it("closes the private pool when connection acquisition fails", async () => {
    const f = fixture();
    f.knex.client.acquireConnection.mockRejectedValueOnce(
      new Error("connect failed"),
    );
    await expect(f.run()).rejects.toThrow("connect failed");
    expect(f.migrate).not.toHaveBeenCalled();
    expect(f.knex.client.releaseConnection).not.toHaveBeenCalled();
    expect(f.knex.destroy).toHaveBeenCalledTimes(1);
  });
  it("closes the session after a lost lock response without attempting migration", async () => {
    const f = fixture();
    f.query.mockRejectedValueOnce(new Error("acquire response lost"));
    await expect(f.run()).rejects.toThrow("acquire response lost");
    expect(f.migrate).not.toHaveBeenCalled();
    expect(f.query).toHaveBeenCalledTimes(1);
    expect(f.knex.destroy).toHaveBeenCalledTimes(1);
  });
  it("unlocks and closes after a failed migration", async () => {
    const f = fixture();
    const failure = new Error("migration failed");
    f.migrate.mockRejectedValueOnce(failure);
    await expect(f.run()).rejects.toBe(failure);
    expect(f.query).toHaveBeenCalledTimes(2);
    expect(f.knex.destroy).toHaveBeenCalledTimes(1);
  });
  it("reports both migration and unlock failures, while still closing the session", async () => {
    const f = fixture();
    const migration = new Error("migration failed"),
      unlock = new Error("unlock response lost");
    f.migrate.mockRejectedValueOnce(migration);
    f.query
      .mockResolvedValueOnce({ rows: [{ acquired: true }] })
      .mockRejectedValueOnce(unlock);
    await expect(f.run()).rejects.toMatchObject({
      errors: [migration, unlock],
      cause: migration,
      message: expect.stringContaining(
        "Error: migration failed; Error: unlock response lost",
      ),
    });
    expect(f.knex.destroy).toHaveBeenCalledTimes(1);
  });
  it("fails visibly if its lock is absent at release", async () => {
    const f = fixture();
    f.query
      .mockResolvedValueOnce({ rows: [{ acquired: true }] })
      .mockResolvedValueOnce({ rows: [{ released: false }] });
    await expect(f.run()).rejects.toThrow(
      "Migration advisory lock was not held",
    );
    expect(f.knex.destroy).toHaveBeenCalledTimes(1);
  });
  it("attempts pool destruction even if release fails and preserves both cleanup errors", async () => {
    const f = fixture();
    const release = new Error("release failed"),
      close = new Error("close failed");
    f.knex.client.releaseConnection.mockRejectedValueOnce(release);
    f.knex.destroy.mockRejectedValueOnce(close);
    await expect(f.run()).rejects.toMatchObject({
      errors: [release, close],
      cause: release,
    });
    expect(f.knex.destroy).toHaveBeenCalledTimes(1);
  });
});
