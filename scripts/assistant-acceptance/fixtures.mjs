import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { MAGIGOO_ID } from "./cases.mjs";
import { parseKnowledgeBody } from "../../packages/shared-utils/src/knowledge-reference.cjs";

// Public fixture marker. It is deliberately NOT a credential for any real service.
export const FIXTURE_MARKER = "fixture-only-no-real-service-access";
const digest = (value) => createHash("sha256").update(value).digest("hex");
export async function createFixtureData(now = Date.now()) {
  const snapshot = JSON.parse(
    await readFile(
      new URL(
        "../../apps/storefront-v3/src/app/api/ai-shopping-assistant/__fixtures__/observed-knowledge-answers.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const docs = ["magigoo-materials", "bms-body-material"].map((id) => {
    const original = snapshot.cases.find((c) => c.id === id).toolOutputs[0]
      .output.documents[0];
    const body = parseKnowledgeBody({
      ...original,
      document_id: "fixture_" + id.replaceAll("-", "_"),
      document_title: "SYNTHETIC REPLAY — " + original.document_title,
      source_version: "synthetic-acceptance-v1",
      source_checked_at: new Date(now - 1000).toISOString(),
      text:
        "Synthetic test replay; not a fresh manufacturer review.\n" +
        original.text,
    });
    if (!body) throw new Error("Invalid fixture contract");
    return {
      ...body,
      revision_hash: digest(JSON.stringify(body)),
      valid_until: new Date(now + 60 * 60 * 1000).toISOString(),
    };
  });
  return {
    docs,
    provenance: {
      type: "synthetic-replay",
      originalObservedAt: snapshot.provenance.observedAt,
      freshness:
        "Run-scoped fixture clock; no new manufacturer approval or fetch",
    },
  };
}
function knowledge(documents) {
  return {
    documents,
    citations: documents.map((d) => ({
      document_id: d.document_id,
      product_id: d.product_id,
      binding_scope: d.binding_scope,
      variant_id: d.variant_id,
      title: d.document_title,
      source_url: d.source_url,
      source_sha256: d.source_sha256,
      source_version: d.source_version,
      source_checked_at: d.source_checked_at,
      revision_hash: d.revision_hash,
      valid_until: d.valid_until,
    })),
  };
}
const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
export function answerFixture(path, body, data, origin) {
  if (!record(body)) return null;
  if (path === "/ai/knowledge-search") {
    if (
      typeof body.query !== "string" ||
      body.query.length > 120 ||
      !body.query.trim() ||
      (body.limit !== undefined &&
        (!Number.isInteger(body.limit) || body.limit < 1 || body.limit > 4))
    )
      return null;
    // Intentional wrong-product response exercises the patched route's rejection boundary.
    if (
      body.product_id === MAGIGOO_ID &&
      /Dragonfly BMS for Magigoo Original/i.test(body.query)
    )
      return knowledge([data.docs[1]]);
    let docs = data.docs.filter((d) =>
      body.product_id
        ? d.product_id === body.product_id
        : /magigoo/i.test(body.query)
          ? d.product_id === MAGIGOO_ID
          : /dragonfly|bms|phaetus/i.test(body.query)
            ? d.product_id !== MAGIGOO_ID
            : false,
    );
    if (body.variant_id) docs = [];
    return knowledge(docs.slice(0, body.limit ?? 4));
  }
  if (path === "/ai/product-guidance") {
    if (typeof body.query !== "string" || body.query.length > 200) return null;
    const products = data.docs
      .filter((d) =>
        /magigoo/i.test(body.query)
          ? d.product_id === MAGIGOO_ID
          : /dragonfly|bms/i.test(body.query)
            ? d.product_id !== MAGIGOO_ID
            : false,
      )
      .map((d) => ({
        id: d.product_id,
        title: d.product_title,
        handle: d.product_handle,
        productUrl: origin + "/products/" + d.product_handle,
      }));
    return {
      status: products.length ? "matches" : "empty",
      mode: body.mode === "browse" ? "browse" : "search",
      query: body.query,
      products,
    };
  }
  if (["/ai/order-lookup", "/ai/tracking"].includes(path)) {
    if (
      body.reference !== "SYNTHETIC-ACCEPTANCE-001" ||
      body.email !== "fixture@example.invalid"
    )
      return null;
    if (path === "/ai/order-lookup")
      return {
        order: {
          custom_display_id: body.reference,
          status: "completed",
          payment_status: "captured",
          fulfillment_status: "shipped",
          total: 1234,
          currency_code: "aud",
          items: [{ title: "Synthetic fixture part", quantity: 1 }],
        },
      };
    return {
      tracking: [
        {
          trackingNumber: "SYNTHETIC-TRACK-001",
          carrierName: "Synthetic Carrier",
          status: "shipped",
        },
      ],
    };
  }
  if (path === "/ai/shipping-estimate") {
    if (
      !Array.isArray(body.items) ||
      body.items.length !== 1 ||
      body.items[0]?.variantId !== "variant_fixture" ||
      body.items[0]?.quantity !== 1 ||
      body.destination?.city !== "Sydney" ||
      body.destination?.postalCode !== "2000" ||
      body.destination?.countryCode !== "AU"
    )
      return null;
    return {
      rates: [
        {
          carrierName: "Synthetic Carrier",
          service: "Fixture standard",
          totalCharge: 1234,
          currency: "AUD",
          transitDays: 3,
        },
      ],
    };
  }
  return null;
}
