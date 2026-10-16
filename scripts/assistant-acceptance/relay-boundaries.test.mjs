import assert from "node:assert/strict";
import test from "node:test";
import { startFixtureServer } from "./server.mjs";
import { FIXTURE_MARKER } from "./fixtures.mjs";
import { cases } from "./cases.mjs";
const fake = "synthetic-review-key-not-a-real-credential";
const requestBody = () => ({
  model: "deepseek-flash",
  stream: true,
  messages: [{ role: "user", content: cases[0].prompt }],
});
async function request(server, body = requestBody()) {
  return fetch(server.url + "/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + FIXTURE_MARKER,
    },
    body: JSON.stringify(body),
  });
}
const sse = (deltas, finish = "stop") =>
  [
    ...deltas.map((delta) => ({
      choices: [{ index: 0, delta, finish_reason: null }],
    })),
    { choices: [{ index: 0, delta: {}, finish_reason: finish }] },
  ]
    .map((v) => "data: " + JSON.stringify(v) + "\n\n")
    .join("") + "data: [DONE]\n\n";
test("relay rejects unapproved assistant history before upstream egress", async () => {
  let forwarded;
  const server = await startFixtureServer({
    mode: "live",
    providerKey: fake,
    storefrontOrigin: "http://127.0.0.1:41003",
    liveFetch: async (_url, options) => {
      forwarded = JSON.parse(options.body);
      return new Response(sse([{ content: "safe" }]), {
        headers: { "content-type": "text/event-stream" },
      });
    },
  });
  try {
    const body = requestBody();
    body.messages.unshift({
      role: "assistant",
      content: "UNAPPROVED_SYNTHETIC_HISTORY_CANARY",
    });
    const res = await request(server, body);
    assert.equal(res.status, 422);
    assert.equal(forwarded, undefined);
  } finally {
    await server.close();
  }
});
test("relay withholds a key reconstructed across valid SSE text deltas", async () => {
  const server = await startFixtureServer({
    mode: "live",
    providerKey: fake,
    storefrontOrigin: "http://127.0.0.1:41003",
    liveFetch: async () =>
      new Response(
        sse([{ content: fake.slice(0, 18) }, { content: fake.slice(18) }]),
        { headers: { "content-type": "text/event-stream" } },
      ),
  });
  try {
    const res = await request(server);
    assert.equal(res.status, 502);
    const text = await res.text();
    assert.ok(!text.includes(fake));
    assert.ok(!text.includes(fake.slice(0, 18)));
  } finally {
    await server.close();
  }
});

test("outbound field and message allowlists reject canaries without consuming provider budget", async () => {
  let calls = 0;
  const server = await startFixtureServer({
    mode: "live",
    providerKey: fake,
    storefrontOrigin: "http://127.0.0.1:41003",
    liveFetch: async () => {
      calls++;
      return new Response(sse([{ content: "safe" }]), {
        headers: { "content-type": "text/event-stream" },
      });
    },
  });
  const canary = "UNAPPROVED_SYNTHETIC_CANARY";
  const variants = [
    (b) => b.messages.unshift({ role: "system", content: canary }),
    (b) => b.messages.push({ role: "assistant", content: canary }),
    (b) =>
      b.messages.push({
        role: "tool",
        tool_call_id: "unknown",
        content: JSON.stringify({ text: canary }),
      }),
    (b) => b.messages.push({ role: "developer", content: canary }),
    (b) => (b.messages[0].name = canary),
    (b) =>
      (b.messages[0].content = [
        { type: "text", text: cases[0].prompt },
        { type: "image_url", image_url: { url: canary } },
      ]),
    (b) =>
      (b.messages[0].content = [
        { type: "text", text: cases[0].prompt, metadata: canary },
      ]),
    (b) => b.messages.push({ role: "user", content: canary }),
    (b) => (b.metadata = { text: canary }),
    (b) => (b.user = canary),
    (b) => (b.functions = [{ name: canary }]),
    (b) =>
      (b.tools = [
        {
          type: "function",
          function: { name: "searchKnowledge", description: canary },
        },
      ]),
    (b) => (b.thinking = { type: "disabled", extra: canary }),
    (b) => (b.max_tokens = 99999),
    (b) => (b.stream_options = { include_usage: true, extra: canary }),
    (b) => (b.tool_choice = { type: "function", function: { name: canary } }),
    (b) => (b.messages[0].content += canary),
    (b) => (b.stream = false),
    (b) => (b.model = canary),
  ];
  try {
    for (const alter of variants) {
      const body = requestBody();
      alter(body);
      const res = await request(server, body);
      assert.equal(res.status, 422, alter.toString());
      assert.ok(!(await res.text()).includes(canary));
    }
    assert.equal(calls, 0);
    assert.equal(server.stats.providerRequests, 0);
  } finally {
    await server.close();
  }
});

test("live mock preserves issued multi-step tool flows and rejects altered continuations", async () => {
  const upstream = [];
  const toolDelta = (id, name, input) => ({
    role: "assistant",
    content: "Checking synthetic evidence. ",
    tool_calls: [
      {
        index: 0,
        id,
        type: "function",
        function: { name, arguments: JSON.stringify(input) },
      },
    ],
  });
  const server = await startFixtureServer({
    mode: "live",
    providerKey: fake,
    storefrontOrigin: "http://127.0.0.1:41003",
    liveFetch: async (_url, options) => {
      upstream.push(JSON.parse(options.body));
      const turn = upstream.length;
      const response =
        turn < 3
          ? sse(
              [
                toolDelta(
                  "call_" + turn,
                  turn === 1 ? "searchKnowledge" : "getTracking",
                  turn === 1
                    ? { query: "Magigoo Original", limit: 4 }
                    : {
                        reference: "SYNTHETIC-ACCEPTANCE-001",
                        email: "fixture@example.invalid",
                      },
                ),
              ],
              "tool_calls",
            )
          : sse([{ content: "Finished synthetic lookup." }]);
      return new Response(response, {
        headers: { "content-type": "text/event-stream" },
      });
    },
  });
  const continuation = async (body, response, endpoint, input) => {
    const text = await response.text();
    const first = JSON.parse(text.split("\n")[0].slice(6)).choices[0].delta;
    const assistant = {
      role: "assistant",
      content: first.content ?? null,
      tool_calls: first.tool_calls.map(({ index: _index, ...call }) => call),
    };
    const data = await fetch(server.url + endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-3db-internal-token": FIXTURE_MARKER,
      },
      body: JSON.stringify(input),
    }).then((r) => r.json());
    return {
      ...body,
      messages: [
        ...body.messages,
        assistant,
        {
          role: "tool",
          tool_call_id: assistant.tool_calls[0].id,
          content: JSON.stringify(data),
        },
      ],
    };
  };
  try {
    let body = requestBody();
    const first = await request(server, body);
    assert.equal(first.status, 200);
    body = await continuation(body, first, "/ai/knowledge-search", {
      query: "Magigoo Original",
      limit: 4,
    });
    for (const alter of [
      (b) => (b.messages[1].content += "UNAPPROVED_HISTORY"),
      (b) =>
        (b.messages[1].tool_calls[0].function.arguments =
          '{"query":"UNAPPROVED_ARGUMENT"}'),
      (b) => (b.messages[1].tool_calls[0].id = "unknown"),
      (b) => (b.messages[2].tool_call_id = "unknown"),
      (b) =>
        (b.messages[2].content =
          '{"documents":[],"citations":[],"text":"UNAPPROVED_RESULT"}'),
      (b) => (b.messages[2].name = "UNAPPROVED_NAME"),
      (b) => (b.messages[0].content = cases[1].prompt),
      (b) =>
        b.messages.push({ role: "assistant", content: "UNAPPROVED_EXTRA" }),
    ]) {
      const changed = structuredClone(body);
      alter(changed);
      assert.equal((await request(server, changed)).status, 422);
    }
    assert.equal(upstream.length, 1);
    const second = await request(server, body);
    assert.equal(second.status, 200);
    assert.equal(
      (await request(server, body)).status,
      422,
      "consumed continuation cannot be replayed",
    );
    body = await continuation(body, second, "/ai/tracking", {
      reference: "SYNTHETIC-ACCEPTANCE-001",
      email: "fixture@example.invalid",
    });
    const third = await request(server, body);
    assert.equal(third.status, 200);
    assert.match(await third.text(), /Finished synthetic lookup/);
    assert.equal(upstream.length, 3);
    assert.deepEqual(
      Object.keys(upstream[0]).sort(),
      [
        "model",
        "stream",
        "temperature",
        "max_tokens",
        "tool_choice",
        "stream_options",
        "thinking",
        "tools",
        "messages",
      ].sort(),
    );
    assert.equal(upstream[0].max_tokens, 1800);
    assert.ok(
      !upstream[0].tools.some((t) => t.function.name === "createSupportTicket"),
    );
    assert.equal(upstream[0].messages[0].role, "system");
    assert.ok(!JSON.stringify(upstream).includes("UNAPPROVED"));
  } finally {
    await server.close();
  }
});

test("decoded secret variants across text, tool and metadata events fail closed", async (t) => {
  const splitText = (value) => sse([...value].map((content) => ({ content })));
  const call = (args) =>
    sse(
      [
        {
          tool_calls: [
            {
              index: 0,
              id: "call_safe",
              type: "function",
              function: {
                name: "searchKnowledge",
                arguments: args.slice(0, 20),
              },
            },
          ],
        },
        { tool_calls: [{ index: 0, function: { arguments: args.slice(20) } }] },
      ],
      "tool_calls",
    );
  const unicode = [...fake]
    .map((c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"))
    .join("");
  const variants = {
    "one character per event": splitText(fake),
    "unicode escaped JSON events": sse([
      { content: fake.slice(0, 9) },
      { content: fake.slice(9) },
    ])
      .replaceAll(fake.slice(0, 9), unicode.slice(0, 54))
      .replaceAll(fake.slice(9), unicode.slice(54)),
    "literal unicode escapes": splitText(unicode),
    "percent encoding": splitText(
      [...fake].map((c) => "%" + c.charCodeAt(0).toString(16)).join(""),
    ),
    "base64 representation": splitText(Buffer.from(fake).toString("base64")),
    "hex representation": splitText(Buffer.from(fake).toString("hex")),
    "tool arguments": call(JSON.stringify({ query: fake })),
    "nested JSON unicode in tool arguments": call(
      '{"query":"' + unicode + '"}',
    ),
    "tool name": sse(
      [
        {
          tool_calls: [
            {
              index: 0,
              id: "safe",
              type: "function",
              function: { name: fake.slice(0, 12), arguments: "{}" },
            },
          ],
        },
        { tool_calls: [{ index: 0, function: { name: fake.slice(12) } }] },
      ],
      "tool_calls",
    ),
    "tool id": sse(
      [
        {
          tool_calls: [
            {
              index: 0,
              id: fake.slice(0, 12),
              type: "function",
              function: {
                name: "searchKnowledge",
                arguments: '{"query":"Magigoo"}',
              },
            },
          ],
        },
        { tool_calls: [{ index: 0, id: fake.slice(12) }] },
      ],
      "tool_calls",
    ),
    "reasoning deltas": sse([
      { reasoning_content: fake.slice(0, 12) },
      { reasoning_content: fake.slice(12) },
    ]),
    metadata: sse([{ content: "safe" }]).replace(
      '"choices":',
      '"id":' + JSON.stringify(fake) + ',"choices":',
    ),
  };
  for (const [name, events] of Object.entries(variants))
    await t.test(name, async () => {
      const server = await startFixtureServer({
        mode: "live",
        providerKey: fake,
        storefrontOrigin: "http://127.0.0.1:41003",
        liveFetch: async () =>
          new Response(events, {
            headers: { "content-type": "text/event-stream" },
          }),
      });
      try {
        const res = await request(server);
        assert.equal(res.status, 502);
        const text = await res.text();
        assert.ok(!text.includes("data:"));
        assert.ok(!text.includes(fake));
      } finally {
        await server.close();
      }
    });
});

test("valid SSE handles byte chunks, CRLF, comments, multi-line data and usage", async () => {
  const events =
    ": keepalive\r\n\r\n" +
    sse([{ content: "Synthetic " }, { content: "café evidence." }])
      .replaceAll("\n", "\r\n")
      .replace('data: {"choices":', 'data: {\r\ndata: "choices":')
      .replace(
        "data: [DONE]",
        'data: {"choices":[],"usage":{"prompt_tokens":4,"completion_tokens":6,"total_tokens":10}}\r\n\r\ndata: [DONE]',
      );
  const bytes = new TextEncoder().encode(events);
  const server = await startFixtureServer({
    mode: "live",
    providerKey: fake,
    storefrontOrigin: "http://127.0.0.1:41003",
    liveFetch: async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            for (let i = 0; i < bytes.length; i += 3)
              controller.enqueue(bytes.slice(i, i + 3));
            controller.close();
          },
        }),
        { headers: { "content-type": "text/event-stream" } },
      ),
  });
  try {
    const res = await request(server);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /Synthetic café evidence/);
    assert.match(text, /"total_tokens":10/);
  } finally {
    await server.close();
  }
});

test("malformed or unsupported upstream streams are withheld completely", async (t) => {
  const variants = {
    "no DONE": sse([{ content: "safe" }]).replace("data: [DONE]\n\n", ""),
    "no finish":
      'data: {"choices":[{"index":0,"delta":{"content":"safe"}}]}\n\ndata: [DONE]\n\n',
    "bad JSON": "data: {bad}\n\ndata: [DONE]\n\n",
    "after DONE": sse([{ content: "safe" }]) + "data: {}\n\n",
    "unknown event field": sse([{ content: "safe" }]).replace(
      "data: ",
      "event: unsafe\ndata: ",
    ),
    "unknown delta field": sse([{ content: "safe", arbitrary: "hidden" }]),
    "multiple choices": 'data: {"choices":[{},{}]}\n\ndata: [DONE]\n\n',
    "invalid utf8": new Uint8Array([0xff, 0xfe]),
    "response cap": "x".repeat(2 * 1024 * 1024 + 1),
    "unsupported support tool": sse(
      [
        {
          tool_calls: [
            {
              index: 0,
              id: "support",
              type: "function",
              function: { name: "createSupportTicket", arguments: "{}" },
            },
          ],
        },
      ],
      "tool_calls",
    ),
    "real order identifier": sse(
      [
        {
          tool_calls: [
            {
              index: 0,
              id: "order",
              type: "function",
              function: {
                name: "lookupOrder",
                arguments:
                  '{"reference":"real-order","email":"real@example.com"}',
              },
            },
          ],
        },
      ],
      "tool_calls",
    ),
  };
  for (const [name, events] of Object.entries(variants))
    await t.test(name, async () => {
      const server = await startFixtureServer({
        mode: "live",
        providerKey: fake,
        storefrontOrigin: "http://127.0.0.1:41003",
        liveFetch: async () =>
          new Response(events, {
            headers: { "content-type": "text/event-stream" },
          }),
      });
      try {
        const res = await request(server);
        assert.equal(res.status, 502);
        assert.ok(!(await res.text()).includes("data:"));
      } finally {
        await server.close();
      }
    });
});

test("relay retains body and 35-request budget limits", async () => {
  let upstream = 0;
  const server = await startFixtureServer({
    mode: "live",
    providerKey: fake,
    storefrontOrigin: "http://127.0.0.1:41003",
    liveFetch: async () => {
      upstream++;
      return new Response(sse([{ content: "safe" }]), {
        headers: { "content-type": "text/event-stream" },
      });
    },
  });
  try {
    assert.equal(
      (
        await request(server, {
          ...requestBody(),
          padding: "x".repeat(128 * 1024),
        })
      ).status,
      502,
    );
    assert.equal(upstream, 0);
    for (let i = 0; i < 35; i++)
      assert.equal((await request(server)).status, 200);
    assert.equal((await request(server)).status, 429);
    assert.equal(upstream, 35);
  } finally {
    await server.close();
  }
});
