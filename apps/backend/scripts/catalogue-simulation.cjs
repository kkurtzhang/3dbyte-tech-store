"use strict";
const { createHash } = require("node:crypto");
const { isDeepStrictEqual } = require("node:util");
const MARKER = "catalogue_simulation";
const record = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const identifier = (value) =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const digest = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

/** Checks modes only; no key, credential or connection string enters an error. */
function assertStagingSimulationRuntime(env) {
  if (
    env.APP_ENV !== "staging" ||
    !env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ||
    !env.NEXT_PUBLIC_STRIPE_KEY?.startsWith("pk_test_") ||
    !/^https:\/\/api\.staging\.3dbytetech\.com\.au\/?$/.test(
      env.MEDUSA_BACKEND_URL || "",
    ) ||
    !/^https:\/\/store\.staging\.3dbytetech\.com\.au\/?$/.test(
      env.STORE_CORS || "",
    )
  ) {
    throw new Error(
      "Catalogue simulation requires the explicit staging target and Stripe test mode.",
    );
  }
}

/** Four-reference preparation only. This never creates products, prices or stock. */
function buildStockSimulationPlan(references, seed) {
  if (
    !identifier(seed) ||
    !Array.isArray(references) ||
    references.length !== 4 ||
    references.some(
      (item) =>
        !record(item) ||
        !identifier(item.reference_id) ||
        !digest(item.packet_sha256),
    ) ||
    new Set(references.map((item) => item.reference_id)).size !== 4
  ) {
    throw new Error(
      "Four unique, hash-bound references and a bounded seed are required.",
    );
  }
  const ranked = references
    .map((item) => ({
      ...item,
      rank: createHash("sha256")
        .update(`${seed}:${item.reference_id}`)
        .digest("hex"),
    }))
    .sort((a, b) => a.rank.localeCompare(b.rank));
  const entries = ranked
    .map((item, index) => ({
      reference_id: item.reference_id,
      packet_sha256: item.packet_sha256,
      seed,
      quantity:
        index === 0
          ? 0
          : index === 1
            ? 1 + (parseInt(item.rank.slice(0, 8), 16) % 4)
            : 8 + (parseInt(item.rank.slice(0, 8), 16) % 23),
    }))
    .sort((a, b) => a.reference_id.localeCompare(b.reference_id));
  return {
    version: 1,
    scope: "staging",
    real_stock: false,
    applied: false,
    seed,
    entries,
  };
}

/** Persist on both the product and its dedicated inventory item before any stock write. */
function attachSimulationMetadata(existing, entry, binding) {
  if (
    !record(entry) ||
    !identifier(entry.reference_id) ||
    !identifier(entry.seed) ||
    !digest(entry.packet_sha256) ||
    !Number.isInteger(entry.quantity) ||
    entry.quantity < 0 ||
    entry.quantity > 30 ||
    !record(binding) ||
    !identifier(binding.product_id) ||
    !identifier(binding.variant_id) ||
    typeof binding.applied_at !== "string" ||
    !Number.isFinite(Date.parse(binding.applied_at))
  ) {
    throw new Error(
      "Simulation metadata requires a valid plan and exact product/variant binding.",
    );
  }
  const marker = {
    version: 1,
    scope: "staging",
    purpose: "inventory_simulation",
    real_stock: false,
    reference_id: entry.reference_id,
    seed: entry.seed,
    packet_sha256: entry.packet_sha256,
    initial_quantity: entry.quantity,
    product_id: binding.product_id,
    variant_id: binding.variant_id,
    applied_at: binding.applied_at,
    promotion_policy:
      "remove_simulation_and_replace_with_verified_stock_before_production",
  };
  const metadata = record(existing) ? existing : {};
  if (
    Object.hasOwn(metadata, MARKER) &&
    !isDeepStrictEqual(metadata[MARKER], marker)
  ) {
    throw new Error(
      "Conflicting simulation marker; reconcile it rather than overwriting provenance.",
    );
  }
  return { ...metadata, [MARKER]: marker };
}

module.exports = {
  MARKER,
  assertStagingSimulationRuntime,
  buildStockSimulationPlan,
  attachSimulationMetadata,
};
