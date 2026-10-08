"use strict";
const { createHash } = require("node:crypto");
const {
  assertStagingSimulationRuntime,
} = require("./catalogue-simulation.cjs");
const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const digest = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const identities = {
  "creality-hotend-2024-4001030133": {
    brand: "Creality",
    retailer: "DREMC",
    variant: "43555662266537",
    sku: "4001030133",
    mpn: "4001030133",
    url: "https://store.dremc.com.au/products/creality-k1c-k1-max-2024-oem-ceramic-hotend-kit?variant=43555662266537",
  },
  "creality-k1-pei-pc-4004090102": {
    brand: "Creality",
    retailer: "DREMC",
    variant: "43045871747241",
    sku: "4004090102",
    mpn: "4004090102",
    url: "https://store.dremc.com.au/products/creality-k1-black-smooth-pei-build-plate-kit-235-235mm?variant=43045871747241",
  },
  "polymaker-charcoal-old-pm70820": {
    brand: "Polymaker",
    retailer: "DREMC",
    variant: "41934926381225",
    sku: "PM70821",
    mpn: "PM70820",
    gtin: "6938936708209",
    url: "https://store.dremc.com.au/products/polymaker-polyterra-pla-matte-filament-1-75mm-1kg?variant=41934926381225",
  },
  "creality-space-pi-au-4005010081": {
    brand: "Creality",
    retailer: "PB Tech Australia",
    variant: "PTRCRL0098",
    sku: "PTRCRL0098",
    mpn: "4005010081",
    gtin: "6971636401698",
    url: "https://www.pbtech.com/au/product/PTRCRL0098/Creality-Accessories-Filament-Dryer-Space-Pi-for-F",
  },
};
function amount(value) {
  if (
    typeof value !== "string" ||
    !/^(?:0|[1-9]\d{0,4})\.\d{2}$/.test(value) ||
    Number(value) <= 0
  )
    throw new Error(
      "An observed positive AUD product unit amount with two decimals is required.",
    );
  return Number(value);
}
function fresh(value, now) {
  const time = typeof value === "string" ? Date.parse(value) : NaN;
  return (
    Number.isFinite(time) && time <= now && now - time <= 24 * 60 * 60 * 1000
  );
}
/** Offline preparation only. Provenance checks do not constitute independent review or native approval. */
function buildReferenceOfferPlan(fixture, stock, env, now = Date.now()) {
  assertStagingSimulationRuntime(env);
  if (
    !Number.isFinite(now) ||
    !record(fixture) ||
    fixture.version !== 1 ||
    fixture.currency !== "AUD" ||
    fixture.scope !== "staging" ||
    fixture.applied !== false ||
    fixture.checkout_enabled !== false ||
    !Array.isArray(fixture.observations) ||
    fixture.observations.length !== 4 ||
    new Set(fixture.observations.map((o) => o?.reference_id)).size !== 4 ||
    !record(stock) ||
    stock.version !== 1 ||
    stock.scope !== "staging" ||
    stock.real_stock !== false ||
    stock.applied !== false ||
    stock.seed !== fixture.stock_seed ||
    !Array.isArray(stock.entries) ||
    stock.entries.length !== 4 ||
    new Set(stock.entries.map((e) => e?.reference_id)).size !== 4
  )
    throw new Error(
      "Four exact, unapplied staging references and their frozen stock plan are required.",
    );
  const entries = fixture.observations
    .map((observation) => {
      if (!record(observation)) throw new Error("Missing price observation.");
      const identity = identities[observation.reference_id];
      const simulation = stock.entries.find(
        (e) => e.reference_id === observation.reference_id,
      );
      const unitAmount = amount(observation.observed_unit_amount);
      const offer = observation.source_offer,
        capture = observation.capture;
      if (
        !identity ||
        !simulation ||
        !digest(simulation.packet_sha256) ||
        simulation.packet_sha256 !== observation.packet_sha256 ||
        !Number.isInteger(simulation.quantity) ||
        simulation.quantity < 0 ||
        simulation.quantity > 30 ||
        simulation.seed !== stock.seed ||
        observation.manufacturer_brand !== identity.brand ||
        observation.retailer_private_label !== false ||
        observation.retailer !== identity.retailer ||
        observation.retailer_variant_id !== identity.variant ||
        observation.retailer_sku !== identity.sku ||
        observation.manufacturer_part_number !== identity.mpn ||
        (identity.gtin !== undefined && observation.gtin !== identity.gtin) ||
        observation.variant_url !== identity.url ||
        observation.product_url !== identity.url.split("?")[0] ||
        observation.currency !== "AUD" ||
        observation.gst_explicitly_stated !== true ||
        observation.gst_included !== true ||
        observation.shipping_included !== false ||
        observation.regular_amount !== null ||
        !["sold_out", "in_stock", "out_of_stock"].includes(
          observation.retailer_availability,
        ) ||
        (observation.observed_retailer_quantity !== null &&
          (!Number.isInteger(observation.observed_retailer_quantity) ||
            observation.observed_retailer_quantity < 0)) ||
        !fresh(observation.checked_at, now) ||
        !record(capture) ||
        capture.http_status !== 200 ||
        !digest(capture.sha256) ||
        capture.requested_url !== identity.url ||
        capture.final_url !== identity.url ||
        !fresh(capture.checked_at, now) ||
        !record(offer) ||
        offer.price !== unitAmount ||
        offer.priceCurrency !== "AUD" ||
        (identity.retailer === "DREMC"
          ? offer.sku !== identity.sku
          : !record(observation.source_product_identity) ||
            observation.source_product_identity.sku !== identity.sku ||
            observation.source_product_identity.mpn !== identity.mpn) ||
        ![
          "https://schema.org/InStock",
          "https://schema.org/OutOfStock",
        ].includes(offer.availability) ||
        (identity.brand === "Polymaker" && offer.gtin13 !== identity.gtin)
      )
        throw new Error(
          "Price provenance conflicts with the exact variant, captured amount, freshness or simulated stock plan.",
        );
      if (
        identity.retailer === "DREMC" &&
        new URL(offer.url, observation.product_url).href !== identity.url
      )
        throw new Error(
          "Captured retailer offer is bound to a different variant.",
        );
      return {
        reference_id: observation.reference_id,
        packet_sha256: observation.packet_sha256,
        native_product_id: null,
        native_variant_id: null,
        prices: [{ currency_code: "aud", amount: unitAmount }],
        required_tax_inclusive: true,
        price_source_url: observation.variant_url,
        price_checked_at: observation.checked_at,
        price_capture_sha256: capture.sha256,
        retailer_availability: observation.retailer_availability,
        observed_retailer_quantity: observation.observed_retailer_quantity,
        simulated_quantity: simulation.quantity,
        simulation_seed: stock.seed,
        real_stock: false,
        checkout_enabled: false,
        applied: false,
        prerequisites: [
          "current_exact_native_product_variant_document_binding",
          "current_independent_source_review_and_native_approval",
          "verified_aud_tax_inclusive_configuration",
          "explicit_staging_offer_activation_and_checkout_verification",
        ],
      };
    })
    .sort((a, b) => a.reference_id.localeCompare(b.reference_id));
  return {
    version: 1,
    scope: "staging",
    currency: "AUD",
    real_stock: false,
    applied: false,
    checkout_enabled: false,
    pricing_policy: "observed_exact_australian_retail_unit_price",
    price_unit: "major_currency_unit",
    fixture_sha256: createHash("sha256")
      .update(
        JSON.stringify({
          ...fixture,
          observations: [...fixture.observations].sort((a, b) =>
            a.reference_id.localeCompare(b.reference_id),
          ),
        }),
      )
      .digest("hex"),
    entries,
  };
}
module.exports = { buildReferenceOfferPlan };
