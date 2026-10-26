import { answerFixture } from "./fixtures.mjs";

const paths = {
  searchKnowledge: "/ai/knowledge-search",
  searchProducts: "/ai/product-guidance",
  lookupOrder: "/ai/order-lookup",
  getTracking: "/ai/tracking",
  estimateShipping: "/ai/shipping-estimate",
};
const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const keys = (v, allowed) =>
  record(v) && Object.keys(v).every((k) => allowed.includes(k));
const boundedQuery = (v, max) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const limit = (v, max) =>
  v === undefined || (Number.isInteger(v) && v >= 1 && v <= max);
const identity = (v) =>
  v === undefined ||
  (typeof v === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(v));

// Rebuild outputs solely from this server's synthetic data. No caller-provided result is trusted.
// Mirrors the reviewed route's transformations; complete SDK runs check for contract drift.
export function normalizeFixtureCall(call) {
  const name = call.function.name;
  const input = JSON.parse(call.function.arguments);
  if (!Object.hasOwn(paths, name)) throw new Error("Unsupported fixture tool");
  if (name === "searchKnowledge" || name === "searchProducts") {
    const knowledge = name === "searchKnowledge";
    if (
      !keys(
        input,
        knowledge
          ? ["query", "limit", "product_id", "variant_id"]
          : ["query", "limit"],
      ) ||
      !boundedQuery(input.query, knowledge ? 120 : 200) ||
      !limit(input.limit, knowledge ? 4 : 6) ||
      !identity(input.product_id) ||
      !identity(input.variant_id)
    )
      throw new Error("Invalid fixture search");
    input.query = input.query.trim();
    input.limit ??= 4;
  } else if (name === "estimateShipping") {
    if (
      !keys(input, ["items", "destination"]) ||
      !Array.isArray(input.items) ||
      input.items.length !== 1 ||
      !keys(input.items[0], ["variantId", "quantity"]) ||
      !keys(input.destination, ["city", "postalCode", "countryCode"])
    )
      throw new Error("Invalid fixture shipping");
    for (const field of ["city", "postalCode", "countryCode"]) {
      if (input.destination[field] !== undefined) {
        if (typeof input.destination[field] !== "string")
          throw new Error("Invalid fixture destination");
        input.destination[field] = input.destination[field].trim();
      }
    }
    if (typeof input.items[0].variantId !== "string")
      throw new Error("Invalid fixture variant");
    input.items[0].variantId = input.items[0].variantId.trim();
    input.items[0].quantity ??= 1;
    input.destination.countryCode ??= "AU";
  } else {
    if (
      !keys(input, ["reference", "email"]) ||
      typeof input.reference !== "string" ||
      typeof input.email !== "string"
    )
      throw new Error("Invalid fixture proof");
    input.reference = input.reference.trim();
    input.email = input.email.trim();
  }
  return { ...call, function: { name, arguments: JSON.stringify(input) } };
}
export function fixtureToolResult(
  call,
  data,
  origin,
  previousCalls = [],
) {
  const name = call.function.name;
  const input = JSON.parse(call.function.arguments);
  const output = answerFixture(paths[name], input, data, origin);
  if (!output) throw new Error("Arguments outside synthetic fixtures");
  const related = previousCalls.filter((c) =>
    name === "searchKnowledge"
      ? c.function.name === name
      : ["lookupOrder", "getTracking", "estimateShipping"].includes(
          c.function.name,
        ),
  );
  if (
    name !== "searchProducts" &&
    (related.some((c) => c.id === call.id) || related.length >= 5)
  )
    return {
      error:
        name === "searchKnowledge"
          ? "Knowledge lookup limit reached."
          : "Lookup limit reached.",
    };
  if (name === "searchKnowledge") {
    if (
      output.documents.some(
        (d) =>
          (input.product_id && d.product_id !== input.product_id) ||
          (input.variant_id &&
            d.variant_id !== null &&
            d.variant_id !== input.variant_id),
      )
    )
      return { error: "Current approved evidence could not be verified." };
    return output;
  }
  if (name !== "searchProducts") return output;
  if (!output.products.length) return { ...output, actions: [] };
  const words = input.query.toLocaleLowerCase().match(/[a-z0-9]+/g) ?? [];
  return {
    ...output,
    products: output.products.map((product) => ({
      ...product,
      evidence: { kind: "catalogue_discovery", compatibility: "unknown" },
    })),
    actions: output.products.map((product) => ({
      id: product.id,
      title: product.title.trim(),
      href: "/products/" + encodeURIComponent(product.handle),
      match:
        words.length &&
        words.every((word) =>
          `${product.title} ${product.handle}`
            .toLocaleLowerCase()
            .includes(word),
        )
          ? "search"
          : "alternative",
    })),
  };
}
