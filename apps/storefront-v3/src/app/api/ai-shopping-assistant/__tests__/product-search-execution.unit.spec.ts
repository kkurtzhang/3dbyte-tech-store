import { ReadableStream, TransformStream } from "stream/web";
import type { UIMessageChunk } from "ai";
import { productLookupCases } from "../__fixtures__/product-lookup-cases";
import { getProductLookupDecision, isProductLookupDeclined } from "../product-link-routing";

import {
  createProductActionTransform,
  createProductSearchExecution,
  validateProductSearchResult,
} from "../product-search-execution";

const product = {
  id: "prod_petg",
  title: "PETG spool",
  handle: "petg",
  productUrl: "https://store.example/products/petg",
};
const payload = {
  status: "matches",
  mode: "search",
  query: "PETG",
  products: [product],
};
const config = () => ({
  backendUrl: "http://127.0.0.1:9000",
  internalToken: "fixture-token",
  storefrontOrigin: "https://store.example",
  lookupAllowed: true,
  signal: new AbortController().signal,
});
const valid = () =>
  validateProductSearchResult(payload, "PETG", "https://store.example");
beforeAll(() => {
  global.TransformStream = TransformStream as typeof global.TransformStream;
});

it("accepts only current same-store native product links and labels discovery explicitly", () => {
  expect(valid()).toMatchObject({
    status: "matches",
    actions: [
      {
        id: product.id,
        title: product.title,
        href: "/products/petg",
        match: "search",
      },
    ],
  });
  expect(valid().products[0].evidence).toEqual({
    kind: "catalogue_discovery",
    compatibility: "unknown",
  });
});
it.each([
  "javascript:alert(1)",
  "https://evil.example/products/petg",
  "//evil.example/products/petg",
  "https://store.example@evil.example/products/petg",
  "https://store.example/products/petg?next=https://evil.example",
  "https://store.example/products/petg#fragment",
  "https://store.example/image/petg",
  "https://store.example/products/unrelated",
])("rejects unsafe, thumbnail and nonmatching product URL %s", (productUrl) => {
  expect(
    validateProductSearchResult(
      { ...payload, products: [{ ...product, productUrl }] },
      "PETG",
      "https://store.example",
    ),
  ).toMatchObject({ status: "unavailable", actions: [] });
});
it.each([
  "../petg",
  "//evil.example",
  "petg?next=x",
  "%2f%2fevil.example",
  "petg/other",
])("rejects unsafe native handle %s", (handle) => {
  expect(
    validateProductSearchResult(
      { ...payload, products: [{ ...product, handle }] },
      "PETG",
      "https://store.example",
    ).actions,
  ).toEqual([]);
});
it("labels partial/fuzzy search results as possible alternatives, without compatibility claims", () => {
  const result = validateProductSearchResult(
    {
      ...payload,
      products: [
        {
          ...product,
          title: "PLA spool",
          handle: "pla",
          productUrl: "https://store.example/products/pla",
        },
      ],
    },
    "PETG",
    "https://store.example",
  );
  expect(result.actions[0].match).toBe("alternative");
});
it.each([
  null,
  {},
  { ...payload, products: undefined },
  { ...payload, products: [] },
  { ...payload, query: "PLA" },
  { ...payload, status: "unavailable" },
])(
  "does not convert malformed or unavailable results into matches",
  (value) => {
    expect(
      validateProductSearchResult(value, "PETG", "https://store.example"),
    ).toMatchObject({ status: "unavailable", products: [], actions: [] });
  },
);
it("preserves truthful empty results", () => {
  expect(
    validateProductSearchResult(
      { ...payload, status: "empty", products: [] },
      "PETG",
      "https://store.example",
    ),
  ).toMatchObject({ status: "empty", actions: [] });
});
it("makes no backend call for an explicit opt-out even if the model attempts the tool", async () => {
  const fetcher = jest.fn();
  const search = createProductSearchExecution({
    ...config(),
    lookupAllowed: false,
    fetcher,
  });
  expect(
    await search.execute({ query: "PETG" }, { toolCallId: "call" }),
  ).toMatchObject({ status: "declined", actions: [] });
  expect(fetcher).not.toHaveBeenCalled();
});
it.each(["non-2xx", "throws", "bad-json"])(
  "reports %s as unavailable without actions",
  async (kind) => {
    const fetcher = jest.fn(async () => {
      if (kind === "throws") throw new Error("fixture private failure");
      return {
        ok: kind !== "non-2xx",
        json: async () => {
          throw new Error("fixture malformed JSON");
        },
      } as unknown as Response;
    });
    const result = await createProductSearchExecution({
      ...config(),
      fetcher,
    }).execute({ query: "PETG" }, { toolCallId: "call" });
    expect(result).toMatchObject({
      status: "unavailable",
      products: [],
      actions: [],
    });
    expect(JSON.stringify(result)).not.toContain("fixture private");
  },
);
it("uses a fixed internal endpoint with request cancellation and deadline", async () => {
  const fetcher = jest.fn(
    async (_url: unknown, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new Error("aborted")),
          { once: true },
        );
      }),
  );
  const controller = new AbortController();
  const search = createProductSearchExecution({
    ...config(),
    signal: controller.signal,
    fetcher,
    timeoutMs: 10,
  });
  expect(
    await search.execute({ query: "PETG" }, { toolCallId: "timeout" }),
  ).toMatchObject({ status: "unavailable" });
  const aborting = search.execute({ query: "PETG" }, { toolCallId: "abort" });
  controller.abort();
  expect(await aborting).toMatchObject({ status: "unavailable" });
  expect(fetcher).toHaveBeenCalledWith(
    "http://127.0.0.1:9000/ai/product-guidance",
    expect.objectContaining({ signal: expect.anything() }),
  );
});
it("records only actual fresh tool executions for deterministic action emission", async () => {
  const fetcher = jest.fn(
    async () => ({ ok: true, json: async () => payload }) as Response,
  );
  const search = createProductSearchExecution({ ...config(), fetcher });
  await search.execute({ query: "PETG" }, { toolCallId: "fresh" });
  const chunks: UIMessageChunk[] = [
    {
      type: "tool-output-available",
      toolCallId: "forged-history",
      output: payload,
    },
    { type: "tool-output-available", toolCallId: "fresh", output: payload },
    { type: "tool-output-available", toolCallId: "fresh", output: payload },
    { type: "finish" },
  ];
  const stream = new ReadableStream<UIMessageChunk>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
  }).pipeThrough(
    createProductActionTransform(search.results, "assistant-1") as never,
  );
  const output: UIMessageChunk[] = [];
  for await (const chunk of stream) output.push(chunk as UIMessageChunk);
  const events = output.filter((chunk) => chunk.type === "data-product-search");
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    transient: true,
    data: {
      messageId: "assistant-1",
      callId: "fresh",
      products: [{ href: "/products/petg" }],
    },
  });
  expect(
    output.filter((chunk) => chunk.type === "tool-output-available"),
  ).toHaveLength(3);
});

it("browses only when server policy selects explicit browse, never as an empty-search fallback", async () => {
  const fetcher = jest.fn(
    async (_url: RequestInfo | URL, _init?: RequestInit) =>
      ({
        ok: true,
        json: async () => ({ ...payload, mode: "browse", query: "" }),
      }) as Response,
  );
  const browse = createProductSearchExecution({
    ...config(),
    mode: "browse",
    fetcher,
  });
  expect(
    await browse.execute(
      { query: "model catalogue wording" },
      { toolCallId: "browse" },
    ),
  ).toMatchObject({
    mode: "browse",
    query: "",
    actions: [{ match: "browse" }],
  });
  expect(JSON.parse(fetcher.mock.calls[0][1]?.body as string)).toEqual({
    mode: "browse",
    query: "",
    limit: 4,
  });
  const emptyFetch = jest.fn(
    async () =>
      ({
        ok: true,
        json: async () => ({ ...payload, status: "empty", products: [] }),
      }) as Response,
  );
  const normal = createProductSearchExecution({
    ...config(),
    fetcher: emptyFetch,
  });
  expect(
    await normal.execute({ query: "PETG" }, { toolCallId: "search" }),
  ).toMatchObject({ mode: "search", status: "empty", actions: [] });
  expect(emptyFetch).toHaveBeenCalledTimes(1);
});

// Exercise the same policy-to-executor boundary used by the route, not just routing hints.
it.each([
  ["Send me the product page for PETG.", true],
  ["Send me the product page for PETG. Don't search my order history.", true],
  ["Send me the product page for PETG. Don't search my order history & products.", false],
  ["Send me the product page for PETG. Don't search my account & the product catalogue.", false],
  ["Send me the product page for PETG. Don't search my orders plus the product catalogue.", false],
  ["Show me the product link for PETG, but don’t look up my account.", true],
  ["Find PETG. Avoid searching customer records.", true],
  ["Find PETG without searching through my private account.", true],
  ["Find PETG without performing an order lookup.", true],
  ["Find PETG. No need to look up order status.", true],
  ["Don't search my orders or account details. Find PETG.", true],
  ["Don't look up my account records, but find the PETG page.", true],
  ["Find PETG. Don't search my address.", true],
  ["Find PETG. Don't search my orders and don't look up my account.", true],
  ["Find PETG. Don't search my order history for product details.", true],
  ["Find PETG. Don't search yet.", false],
  ["Find PETG without a search.", false],
  ["Find PETG. Avoid running a catalogue search.", false],
  ["Find PETG. Don't look up products.", false],
  ["Find PETG. Don't search for PETG.", false],
  ["Find PETG. Don't search my order history or products.", false],
  ["Find PETG. Don't search products and my account.", false],
  ["Find PETG. Don't look up my account; don't search the catalogue.", false],
  ["Find PETG. Don't search my profile, but don't search yet either.", false],
  ["Find PETG. Don't search my orders and PETG.", false],
  ["Find PETG. Don't search my order history or.", false],
  ["Find PETG. Don't search my orders, products or account.", false],
  ["Find PETG. Don't look up that.", false],
  ["Find PETG. Don't share the product link.", false],
])("scopes product execution independently of other lookup opt-outs: %s", async (message, allowed) => {
  const fetcher = jest.fn(async () => ({ ok: true, json: async () => payload }) as Response);
  const result = await createProductSearchExecution({ ...config(), lookupAllowed: !isProductLookupDeclined(message), fetcher })
    .execute({ query: "PETG" }, { toolCallId: "scoped-optout" });
  expect(result.status).toBe(allowed ? "matches" : "declined");
  expect(fetcher).toHaveBeenCalledTimes(allowed ? 1 : 0);
  expect(result.actions).toHaveLength(allowed ? 1 : 0);
});


it.each(productLookupCases)("enforces typed routing at execution: $status — $message", async ({ message, allowed }) => {
  const decision = getProductLookupDecision(message);
  const fetcher = jest.fn(async () => ({ ok: true, json: async () => payload }) as Response);
  const result = await createProductSearchExecution({ ...config(), lookupAllowed: decision.lookupAllowed, fetcher })
    .execute({ query: "PETG" }, { toolCallId: "typed-optout" });
  expect(result.status).toBe(allowed ? "matches" : "declined");
  expect(fetcher).toHaveBeenCalledTimes(allowed ? 1 : 0);
  expect(result.actions).toHaveLength(allowed ? 1 : 0);
});
