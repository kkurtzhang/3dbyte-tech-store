import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import http from "node:http";
import { cases, checkAnswer } from "./cases.mjs";
import { fixtureToolResult } from "./relay-tools.mjs";
import {
  createFixtureData,
  answerFixture,
  FIXTURE_MARKER,
} from "./fixtures.mjs";
import { startFixtureServer } from "./server.mjs";
import {
  parseOptions,
  providerKeyFromText,
  childEnvironment,
} from "./config.mjs";

test("seven acceptance cases are distinct and reject missing evidence", () => {
  assert.equal(cases.length, 7);
  assert.equal(new Set(cases.map((c) => c.id)).size, 7);
  for (const item of cases) assert.equal(checkAnswer(item, []).passed, false);
});
test("configuration rejects accidental live execution and unknown arguments", () => {
  assert.equal(parseOptions(["run"]).mode, "deterministic");
  assert.throws(() => parseOptions(["run", "--mode", "production"]));
  assert.throws(() =>
    parseOptions(["run", "--backend", "https://example.com"]),
  );
  assert.throws(() => providerKeyFromText("DEEPSEEK_API_KEY=\n"));
  assert.throws(() =>
    providerKeyFromText(
      "DEEPSEEK_API_KEY=sample-value\nINTERNAL_API_TOKEN=other",
    ),
  );
  assert.equal(
    providerKeyFromText(
      "# private\nDEEPSEEK_API_KEY=synthetic-unit-test-value\n",
    ),
    "synthetic-unit-test-value",
  );
});
test("child environment does not inherit keys, proxies, options or remote endpoints", () => {
  const env = childEnvironment({
    runDir: "/Volumes/MINI-M1/example",
    fixturePort: 42001,
    redisPort: 42002,
    nextPort: 42003,
    releaseSha: "fixture",
  });
  assert.equal(env.DEEPSEEK_API_KEY, FIXTURE_MARKER);
  assert.equal(env.INTERNAL_API_TOKEN, FIXTURE_MARKER);
  assert.equal(env.HTTPS_PROXY, undefined);
  assert.equal(env.LANGFUSE_SECRET_KEY, undefined);
  assert.equal(env.AI_ASSISTANT_LOCAL_KNOWLEDGE, undefined);
  assert.match(env.MEDUSA_SERVER_BACKEND_URL, /^http:\/\/127\.0\.0\.1:42001$/);
});
test("fresh fixture documents have consistent citations and no customer connection", async () => {
  const data = await createFixtureData();
  const result = answerFixture(
    "/ai/knowledge-search",
    { query: "Dragonfly BMS", limit: 4 },
    data,
    "http://127.0.0.1:42003",
  );
  assert.equal(result.documents.length, 1);
  assert.match(result.documents[0].document_title, /SYNTHETIC/);
  assert.equal(
    result.citations[0].revision_hash,
    result.documents[0].revision_hash,
  );
  assert.equal(
    answerFixture(
      "/ai/order-lookup",
      { reference: "real-order", email: "real@example.com" },
      data,
      "",
    ),
    null,
  );
  assert.equal(answerFixture("/ai/support-ticket", {}, data, ""), null);
  assert.equal(
    answerFixture(
      "/ai/shipping-estimate",
      {
        items: [{ variantId: "real_variant", quantity: 1 }],
        destination: { city: "Sydney", postalCode: "2000", countryCode: "AU" },
      },
      data,
      "",
    ),
    null,
  );
});
test("fixture server enforces marker, exact host, methods and endpoint allowlist", async () => {
  const service = await startFixtureServer({
    mode: "deterministic",
    storefrontOrigin: "http://127.0.0.1:42003",
  });
  try {
    const headers = {
      "content-type": "application/json",
      "x-3db-internal-token": FIXTURE_MARKER,
    };
    const call = (path, body, extra = {}) =>
      fetch(service.url + path, {
        method: "POST",
        headers: { ...headers, ...extra },
        body: JSON.stringify(body),
      });
    assert.equal(
      (await call("/ai/knowledge-search", { query: "Dragonfly" })).status,
      200,
    );
    assert.equal(
      (
        await call(
          "/ai/knowledge-search",
          { query: "Dragonfly" },
          { "x-3db-internal-token": "wrong" },
        )
      ).status,
      401,
    );
    assert.equal((await call("/ai/support-ticket", {})).status, 403);
    assert.equal((await call("/ai/support-ticket/prepare", {})).status, 403);
    assert.equal(
      (
        await call("/ai/order-lookup", {
          reference: "real",
          email: "real@example.com",
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await call(
          "/ai/knowledge-search",
          { query: "Dragonfly" },
          { origin: "https://other.example" },
        )
      ).status,
      403,
    );
    assert.equal(
      await new Promise((resolve) => {
        const req = http.get(
          service.url + "/health",
          { headers: { host: "evil.example" } },
          (res) => {
            res.resume();
            resolve(res.statusCode);
          },
        );
        req.on("error", () => resolve(0));
      }),
      403,
    );
    assert.equal((await fetch(service.url + "/unknown")).status, 403);
  } finally {
    await service.close();
  }
  await assert.rejects(fetch(service.url + "/health"));
});
test("deterministic provider speaks OpenAI SSE and requires a named case", async () => {
  const service = await startFixtureServer({
    mode: "deterministic",
    storefrontOrigin: "http://127.0.0.1:42003",
  });
  try {
    const req = (messages) =>
      fetch(service.url + "/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer " + FIXTURE_MARKER,
        },
        body: JSON.stringify({
          model: "deepseek-flash",
          stream: true,
          messages,
        }),
      });
    const response = await req([{ role: "user", content: cases[0].prompt }]);
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.match(body, /searchKnowledge/);
    assert.match(body, /\[DONE\]/);
    assert.equal(
      (await req([{ role: "user", content: "unapproved prompt" }])).status,
      422,
    );
  } finally {
    await service.close();
  }
});
test("source files keep live configuration and customer endpoints out of fixtures", async () => {
  const source = await readFile(
    new URL("./fixtures.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /\bfetch\s*\(|https\.request|http\.request|process\.env/,
  );
});

test("live relay pins the official endpoint and keeps its key out of downstream output", async () => {
  const fake = "fixture-provider-key-not-a-real-credential";
  let request;
  const service = await startFixtureServer({
    mode: "live",
    providerKey: fake,
    storefrontOrigin: "http://127.0.0.1:42003",
    liveFetch: async (url, options) => {
      request = { url, options };
      return new Response("data: " + JSON.stringify({ text: fake }) + "\n\n", {
        headers: { "content-type": "text/event-stream" },
      });
    },
  });
  try {
    const response = await fetch(service.url + "/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + FIXTURE_MARKER,
      },
      body: JSON.stringify({
        model: "deepseek-flash",
        stream: true,
        messages: [{ role: "user", content: cases[0].prompt }],
      }),
    });
    assert.equal(request.url, "https://api.deepseek.com/chat/completions");
    assert.equal(request.options.redirect, "error");
    assert.equal(request.options.headers.authorization, "Bearer " + fake);
    assert.doesNotMatch(await response.text(), new RegExp(fake));
    assert.equal(service.stats.realProviderRequests, 0);
    assert.equal(service.stats.mockProviderRequests, 1);
  } finally {
    await service.close();
  }
});
test("live relay hides provider error bodies", async () => {
  const service = await startFixtureServer({
    mode: "live",
    providerKey: "fixture-provider-key-not-real",
    storefrontOrigin: "http://127.0.0.1:42003",
    liveFetch: async () =>
      new Response("private provider error", { status: 401 }),
  });
  try {
    const response = await fetch(service.url + "/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + FIXTURE_MARKER,
      },
      body: JSON.stringify({
        model: "deepseek-flash",
        stream: true,
        messages: [{ role: "user", content: cases[0].prompt }],
      }),
    });
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /private provider error/);
  } finally {
    await service.close();
  }
});


test("customer cases do not coach evidence, attribution or hardware uncertainty", () => {
  const customer = cases.filter((item) => item.kind !== "adversarial");
  assert.equal(customer.length, 6);
  for (const item of customer) assert.doesNotMatch(item.prompt, /cite|approved|evidence|do not assume|distinguish|firmware/i);
  assert.equal(cases.find((item) => item.id === "unsupported-installed-temperature").prompt, "Can I run my Dragonfly BMS at 500°C?");
  assert.equal(cases.find((item) => item.id === "mismatched-product-evidence").kind, "adversarial");
});
test("the evaluator rejects inline, premature or duplicate sources even with expected content", () => {
  const item = cases.find((item) => item.id === "bms-body-material");
  const source = { type: "source-url", url: "https://www.phaetus.com/manual", title: "Fixture" };
  const events = [
    { type: "tool-input-available", toolName: "searchKnowledge" },
    { type: "text-delta", delta: "copper alloy" },
    { type: "text-end" }, source, { type: "finish" },
  ];
  assert.equal(checkAnswer(item, events).passed, true);
  assert.equal(checkAnswer(item, events.map((event) => event.type === "text-delta" ? { ...event, delta: "copper alloy. View https://store.example/products/bms and use array[1]." } : event)).passed, true);
  assert.equal(checkAnswer(item, [...events, source]).passed, false);
  assert.equal(checkAnswer(item, [source, ...events.filter((event) => event !== source)]).passed, false);
  assert.equal(checkAnswer(item, events.map((event) => event.type === "text-delta" ? { ...event, delta: "copper alloy Source: https://www.phaetus.com/manual" } : event)).passed, false);
});


test("natural temperature requests use ordinary synthetic catalogue results without a prompt-specific shortcut", async () => {
  const data = await createFixtureData();
  const result = fixtureToolResult({ id: "natural-search", function: { name: "searchProducts", arguments: JSON.stringify({ query: "Dragonfly BMS", limit: 4 }) } }, data, "http://127.0.0.1:42003");
  assert.equal(result.status, "matches");
  assert.equal(result.actions.length, 1);
  assert.equal(result.products[0].evidence.compatibility, "unknown");
});
