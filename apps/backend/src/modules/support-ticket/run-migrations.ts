import path from "node:path";
import type { LoaderOptions, ModulesSdkTypes } from "@medusajs/framework/types";
import {
  loadDatabaseConfig,
  mikroOrmCreateConnection,
} from "@medusajs/framework/utils";

/** Commit each migration before a nontransactional concurrent index starts. */
export async function runSupportTicketMigrations({
  options,
  logger,
}: Pick<
  LoaderOptions<ModulesSdkTypes.ModuleServiceInitializeOptions>,
  "options" | "logger"
> = {}) {
  const log = logger ?? console;
  const database = loadDatabaseConfig("supportTicket", options);
  const orm = await mikroOrmCreateConnection(
    { ...database, snapshot: false },
    [],
    path.join(__dirname, "migrations"),
  );
  try {
    // Only this migration connection changes. Individual transactional migrations
    // retain their transaction; historical migrations are not rewritten.
    // Set before the native migrator is lazily instantiated by getMigrator().
    orm.config.set("migrations", {
      ...orm.config.get("migrations"),
      allOrNothing: false,
    });
    log.info("supportTicket: running migrations with individual commits");
    const result = await orm.getMigrator().up();
    for (const migration of result)
      log.info(`supportTicket: migrated ${migration.name}`);
    return result.map((migration) => ({
      name: migration.name,
      path:
        migration.path ?? path.join(__dirname, "migrations", migration.name),
    }));
  } finally {
    await orm.close(true);
  }
}
