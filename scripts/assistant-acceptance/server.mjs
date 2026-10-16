import http from "node:http";
import { once } from "node:events";
import { createConversationBoundary } from "./relay-conversation.mjs";
import { decodeProviderSse, encodeProviderSse } from "./relay-sse.mjs";
import {
  createFixtureData,
  answerFixture,
  FIXTURE_MARKER,
} from "./fixtures.mjs";

const ALLOWED_PATHS = new Set([
  "/ai/knowledge-search",
  "/ai/product-guidance",
  "/ai/order-lookup",
  "/ai/tracking",
  "/ai/shipping-estimate",
]);
const MAX_BODY = 128 * 1024;
async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error("Body too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function deterministicSse(body, item) {
  const done = body.messages.some((m) => m.role === "tool");
  const delta = done
    ? {
        role: "assistant",
        content:
          "UNSAFE_UNGROUNDED: Every printer is safe at 500 degrees. fixture@example.invalid",
      }
    : {
        role: "assistant",
        tool_calls: item.calls.map((call, index) => ({
          index,
          id: "fixture_call_" + index,
          type: "function",
          function: { name: call.name, arguments: JSON.stringify(call.input) },
        })),
      };
  const chunk = (delta, reason) => ({
    id: "fixture-chat-completion",
    object: "chat.completion.chunk",
    created: 1,
    model: "deepseek-flash",
    choices: [{ index: 0, delta, finish_reason: reason }],
  });
  return (
    [chunk(delta, null), chunk({}, done ? "stop" : "tool_calls")]
      .map((value) => "data: " + JSON.stringify(value) + "\n\n")
      .join("") + "data: [DONE]\n\n"
  );
}
export async function startFixtureServer({
  mode,
  storefrontOrigin,
  providerKey,
  liveFetch = fetch,
}) {
  if (!["deterministic", "live"].includes(mode))
    throw new Error("Invalid fixture mode");
  if (mode === "live" && !providerKey)
    throw new Error("Live mode needs a user-provided provider key");
  const data = await createFixtureData();
  const conversations = createConversationBoundary(data, storefrontOrigin);
  const stats = {
    backendRequests: {},
    deniedRequests: 0,
    providerRequests: 0,
    realProviderRequests: 0,
    mockProviderRequests: 0,
  };
  let serverPort;
  const active = new Set();
  const server = http.createServer(async (req, res) => {
    const json = (status, value) => {
      res.writeHead(status, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      res.end(JSON.stringify(value));
    };
    const deny = (status = 403) => {
      stats.deniedRequests++;
      json(status, { error: "Fixture request rejected" });
    };
    try {
      if (
        req.socket.remoteAddress !== "127.0.0.1" ||
        req.headers.host !== `127.0.0.1:${serverPort}` ||
        req.headers.origin
      )
        return deny();
      if (req.method === "GET" && req.url === "/health")
        return json(200, { service: "synthetic-assistant-fixtures", mode });
      if (
        req.method !== "POST" ||
        req.headers["content-type"]?.split(";")[0] !== "application/json"
      )
        return deny();
      if (!ALLOWED_PATHS.has(req.url) && req.url !== "/chat/completions")
        return deny();
      const provider = req.url === "/chat/completions";
      if (
        (provider
          ? req.headers.authorization
          : req.headers["x-3db-internal-token"]) !==
        (provider ? "Bearer " + FIXTURE_MARKER : FIXTURE_MARKER)
      )
        return deny(401);
      const body = await readJson(req);
      if (!provider) {
        stats.backendRequests[req.url] =
          (stats.backendRequests[req.url] ?? 0) + 1;
        const result = answerFixture(req.url, body, data, storefrontOrigin);
        return result ? json(200, result) : deny(422);
      }
      let prepared;
      try {
        prepared = conversations.prepare(body);
      } catch {
        return deny(422);
      }
      const { item } = prepared;
      if (stats.providerRequests >= 35) return deny(429);
      stats.providerRequests++;
      if (mode === "deterministic") {
        const decoded = decodeProviderSse(
          deterministicSse(prepared.body, item),
        );
        decoded.assistant = conversations.complete(prepared, decoded.assistant);
        res.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-store",
        });
        return res.end(encodeProviderSse(decoded));
      }
      // Only this fixed endpoint can receive the key. No URL override or redirects.
      const controller = new AbortController();
      active.add(controller);
      res.on("close", () => controller.abort());
      const timer = setTimeout(() => controller.abort(), 45000);
      try {
        if (liveFetch === fetch) stats.realProviderRequests++;
        else stats.mockProviderRequests++;
        const upstream = await liveFetch(
          "https://api.deepseek.com/chat/completions",
          {
            method: "POST",
            redirect: "error",
            signal: controller.signal,
            headers: {
              "content-type": "application/json",
              authorization: "Bearer " + providerKey,
            },
            body: JSON.stringify(prepared.body),
          },
        );
        if (
          !upstream.ok ||
          !upstream.headers.get("content-type")?.includes("text/event-stream")
        )
          return json(502, {
            error: "Provider request failed; details withheld",
          });
        // Buffer, decode and check semantic deltas before any downstream output.
        let size = 0;
        const chunks = [];
        for await (const chunk of upstream.body) {
          size += chunk.length;
          if (size > 2 * 1024 * 1024)
            throw new Error("Provider response too large");
          chunks.push(chunk);
        }
        const text = new TextDecoder("utf-8", { fatal: true }).decode(
          Buffer.concat(chunks),
        );
        const decoded = decodeProviderSse(text, providerKey);
        decoded.assistant = conversations.complete(prepared, decoded.assistant);
        res.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-store",
        });
        res.end(encodeProviderSse(decoded));
      } finally {
        clearTimeout(timer);
        active.delete(controller);
      }
    } catch {
      if (!res.headersSent)
        json(502, {
          error: "Fixture or provider request failed; details withheld",
        });
      else res.end();
    }
  });
  server.requestTimeout = 50000;
  server.headersTimeout = 10000;
  server.maxHeadersCount = 30;
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  serverPort = server.address().port;
  return {
    url: `http://127.0.0.1:${serverPort}`,
    port: serverPort,
    stats,
    provenance: {
      ...data.provenance,
      providerTransport:
        mode === "deterministic"
          ? "simulator"
          : liveFetch === fetch
            ? "official-provider"
            : "injected-test-transport",
    },
    async close() {
      for (const c of active) c.abort();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
