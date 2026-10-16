// Child process: use the complete pinned application migration coordinator.
// No application .env, service loader, notification provider, or live database.
require("ts-node/register/transpile-only");
const path = require("node:path");
const { MedusaAppMigrateUp } = require("@medusajs/framework/modules-sdk");
const url = new URL(process.argv[2]);
if (
  url.hostname !== "127.0.0.1" ||
  url.password ||
  !/^\/coordinator_test_[a-z0-9_]+$/.test(url.pathname)
) {
  throw new Error("Synthetic loopback migration database required");
}
const modulePath = path.resolve(__dirname, "../..");
const database = { clientUrl: url.href, schema: "public" };
const mode = process.argv[3] || "normal";
const support = require(modulePath).default;
const migrate = support.runMigrations;
// One barrier per process: the pinned loader may invoke a custom run hook again
// while assembling default revert handlers. A released barrier stays released.
const proceed =
  mode === "hold" || mode === "transaction"
    ? new Promise((resolve) => process.once("message", resolve))
    : undefined;
support.runMigrations = async (...args) => {
  process.send?.({ kind: "entered", at: Date.now() });
  try {
    if (mode === "fail") throw new Error("Synthetic migration failure");
    if (proceed) await proceed;
    if (mode === "transaction") return [];
    return await migrate(...args);
  } finally {
    process.send?.({ kind: "leaving", at: Date.now() });
  }
};
MedusaAppMigrateUp({
  modulesConfig: {
    supportTicket: {
      resolve: modulePath,
      options: {
        database,
        migrationLock: mode === "transaction" ? undefined : "session",
      },
    },
  },
  sharedResourcesConfig: { database },
}).then(
  () => {
    process.stdout.write("MIGRATION_OK\n");
    process.exitCode = 0;
  },
  (error) => {
    process.stderr.write(String(error.stack || error) + "\n");
    process.exitCode = 1;
  },
);
