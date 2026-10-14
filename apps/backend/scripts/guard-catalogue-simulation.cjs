"use strict";
const {
  MARKER,
  assertStagingSimulationRuntime,
} = require("./catalogue-simulation.cjs");

/** Run after migrations and before server/worker startup; no Medusa bootstrap. */
async function verifyCatalogueSimulationRuntime({
  env = process.env,
  clientFactory,
} = {}) {
  if (!env.DATABASE_URL)
    throw new Error(
      "Catalogue simulation safety check failed: database configuration is required.",
    );
  let client;
  try {
    const factory =
      clientFactory ||
      ((options) => new (require("@medusajs/framework/pg").Client)(options));
    client = factory({
      connectionString: env.DATABASE_URL,
      connectionTimeoutMillis: 10_000,
      query_timeout: 10_000,
    });
    await client.connect();
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '5s'");
    const result = await client.query(
      `SELECT (
      EXISTS (SELECT 1 FROM product WHERE deleted_at IS NULL AND metadata ? $1)
      OR EXISTS (SELECT 1 FROM inventory_item WHERE deleted_at IS NULL AND metadata ? $1)
    ) AS has_simulation`,
      [MARKER],
    );
    if (
      result.rows.length !== 1 ||
      typeof result.rows[0].has_simulation !== "boolean"
    ) {
      throw new Error("Invalid safety probe");
    }
    const has_simulation = result.rows[0].has_simulation;
    if (has_simulation) assertStagingSimulationRuntime(env);
    await client.query("COMMIT");
    return { has_simulation, allowed: true };
  } catch {
    if (client) await client.query("ROLLBACK").catch(() => {});
    throw new Error(
      "Catalogue simulation safety check failed: verify staging/test mode and remove simulated stock before production.",
    );
  } finally {
    if (client) {
      try {
        await client.end();
      } catch {
        throw new Error(
          "Catalogue simulation safety check failed: database cleanup did not complete.",
        );
      }
    }
  }
}

if (require.main === module) {
  verifyCatalogueSimulationRuntime().then(
    (result) =>
      console.log(JSON.stringify({ catalogue_simulation_guard: result })),
    (error) => {
      console.error(error.message);
      process.exitCode = 1;
    },
  );
}
module.exports = { verifyCatalogueSimulationRuntime };
