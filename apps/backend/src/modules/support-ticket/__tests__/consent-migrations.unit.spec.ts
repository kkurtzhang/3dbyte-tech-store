import { MigrationRunner } from "@medusajs/framework/mikro-orm/migrations"
import { Migration20261015053000 } from "../migrations/Migration20261015053000"
import { Migration20261015053100 } from "../migrations/Migration20261015053100"

it("keeps both additive DDL operations outside the native runner's master transaction", async () => {
  const driver = { execute: jest.fn().mockResolvedValue(undefined),
    getConnection: () => ({ transactional: jest.fn(() => { throw new Error("DDL must not use master transaction") }) }),
    getPlatform: () => ({ getSchemaHelper: () => ({ getSchemaBeginning: () => "", getSchemaEnd: () => "" }) }) }
  const config = { get: () => "utf8" }
  const runner = new MigrationRunner(driver as never, { transactional: true, disableForeignKeys: false } as never, config as never)
  runner.setMasterMigration({ synthetic: true } as never)
  for (const MigrationClass of [Migration20261015053000, Migration20261015053100]) {
    const migration = new MigrationClass(driver as never, config as never)
    await runner.run(migration, "up")
  }
  expect(driver.execute).toHaveBeenCalledTimes(2)
  expect(driver.execute.mock.calls.every((args) => args.length === 1)).toBe(true)
  expect(driver.execute.mock.calls[0][0]).toContain("add column")
  expect(driver.execute.mock.calls[1][0]).toContain("create unique index concurrently")
})
