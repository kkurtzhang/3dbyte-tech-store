import type {
  AssistantProductAction,
  AssistantProductSearchEvent,
  ProductSearchMode,
} from "@3dbyte-tech-store/shared-types";
import type { UIMessageChunk } from "ai";

import { maskCompleteEmailAddresses } from "./visible-output-sanitizer";

export type ProductSearchResult = Omit<
  AssistantProductSearchEvent,
  "messageId" | "callId" | "products"
> & {
  products: Array<Record<string, unknown>>;
  actions: AssistantProductAction[];
};
type SearchInput = { query: string; limit?: number };
type SearchConfig = {
  backendUrl: string;
  internalToken: string;
  storefrontOrigin: string;
  lookupAllowed: boolean;
  mode?: ProductSearchMode;
  signal: AbortSignal;
  timeoutMs?: number;
  fetcher?: typeof fetch;
};
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const safeHandle = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,199}$/;

function outcome(
  status: ProductSearchResult["status"],
  query: string,
  mode: ProductSearchMode = "search",
): ProductSearchResult {
  return { status, mode, query, products: [], actions: [] };
}

/** Current trusted backend result only. Never consume client history or model-authored URLs. */
export function validateProductSearchResult(
  value: unknown,
  query: string,
  storefrontOrigin: string,
  mode: ProductSearchMode = "search",
): ProductSearchResult {
  const unavailable = outcome("unavailable", query, mode);
  if (
    !record(value) ||
    value.mode !== mode ||
    value.query !== query ||
    !Array.isArray(value.products)
  )
    return unavailable;
  if (value.status === "empty" && value.products.length === 0)
    return outcome("empty", query, mode);
  if (
    value.status !== "matches" ||
    value.products.length === 0 ||
    value.products.length > 6
  )
    return unavailable;
  let origin: string;
  try {
    const url = new URL(storefrontOrigin);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return unavailable;
    origin = url.origin;
  } catch {
    return unavailable;
  }
  const products: Array<Record<string, unknown>> = [];
  const actions: AssistantProductAction[] = [];
  for (const product of value.products) {
    if (
      !record(product) ||
      typeof product.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(product.id) ||
      typeof product.title !== "string" ||
      !product.title.trim() ||
      product.title.length > 300 ||
      typeof product.handle !== "string" ||
      !safeHandle.test(product.handle)
    )
      continue;
    const href = `/products/${encodeURIComponent(product.handle)}`;
    if (
      product.productUrl !== `${origin}${href}` ||
      actions.some((action) => action.id === product.id)
    )
      continue;
    const words = query.toLocaleLowerCase().match(/[a-z0-9]+/g) ?? [];
    const searchable = `${product.title} ${product.handle}`.toLocaleLowerCase();
    const direct =
      words.length > 0 && words.every((word) => searchable.includes(word));
    products.push({
      ...product,
      evidence: { kind: "catalogue_discovery", compatibility: "unknown" },
    });
    actions.push({
      id: product.id,
      title: product.title.trim(),
      href,
      match: mode === "browse" ? "browse" : direct ? "search" : "alternative",
    });
  }
  return products.length
    ? { status: "matches", mode, query, products, actions }
    : unavailable;
}

export function createProductSearchExecution(config: SearchConfig) {
  const results = new Map<string, ProductSearchResult>();
  return {
    results,
    execute: async (
      input: SearchInput,
      { toolCallId }: { toolCallId: string },
    ) => {
      const mode = config.mode ?? "search";
      const query = mode === "browse" ? "" : input.query.trim().slice(0, 200);
      let result = outcome(
        config.lookupAllowed ? "unavailable" : "declined",
        query,
        mode,
      );
      if (config.lookupAllowed && !config.signal.aborted) {
        const controller = new AbortController();
        const abort = () => controller.abort();
        config.signal.addEventListener("abort", abort, { once: true });
        const timer = setTimeout(abort, config.timeoutMs ?? 5_000);
        try {
          const response = await (config.fetcher ?? fetch)(
            `${config.backendUrl}/ai/product-guidance`,
            {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-3db-internal-token": config.internalToken,
              },
              body: JSON.stringify({
                query,
                limit: input.limit ?? 4,
                ...(mode === "browse" ? { mode } : {}),
              }),
              signal: controller.signal,
            },
          );
          if (response.ok && !controller.signal.aborted) {
            result = validateProductSearchResult(
              await response.json(),
              query,
              config.storefrontOrigin,
              mode,
            );
          }
          if (controller.signal.aborted)
            result = outcome("unavailable", query, mode);
        } catch {
          result = outcome("unavailable", query, mode);
        } finally {
          clearTimeout(timer);
          config.signal.removeEventListener("abort", abort);
        }
      }
      results.set(toolCallId, result);
      return result;
    },
  };
}

/** Add actions only for executions recorded in this request, never arbitrary tool parts. */
export function createProductActionTransform(
  results: Map<string, ProductSearchResult>,
  messageId: string,
) {
  return new TransformStream<UIMessageChunk, UIMessageChunk>({
    transform(chunk, controller) {
      controller.enqueue(chunk);
      if (chunk.type !== "tool-output-available") return;
      const result = results.get(chunk.toolCallId);
      if (!result) return;
      results.delete(chunk.toolCallId);
      const data: AssistantProductSearchEvent = {
        messageId,
        callId: chunk.toolCallId,
        status: result.status,
        mode: result.mode,
        query: maskCompleteEmailAddresses(result.query),
        products: result.actions.map((action) => ({
          ...action,
          title: maskCompleteEmailAddresses(action.title),
        })),
      };
      controller.enqueue({
        type: "data-product-search",
        data,
        transient: true,
      });
    },
  });
}
