import {
  ReadableStream as NodeReadableStream,
  TransformStream as NodeTransformStream,
  WritableStream as NodeWritableStream,
} from "stream/web";
import { TextEncoder, TextDecoder } from "util";
import { serialize, deserialize } from "v8";
import type { MockLanguageModelV3 } from "ai/test";
import { z } from "zod";

import {
  createProductActionTransform,
  createProductSearchExecution,
} from "../product-search-execution";

type ProviderStream = Awaited<
  ReturnType<MockLanguageModelV3["doStream"]>
>["stream"];
type ProviderChunk =
  ProviderStream extends ReadableStream<infer Chunk> ? Chunk : never;
const original = {
  WritableStream: global.WritableStream,
  ReadableStream: global.ReadableStream,
  TransformStream: global.TransformStream,
  TextEncoder: global.TextEncoder,
  TextDecoder: global.TextDecoder,
  structuredClone: global.structuredClone,
};
beforeAll(() => {
  Object.assign(global, {
    WritableStream: NodeWritableStream,
    ReadableStream: NodeReadableStream,
    TransformStream: NodeTransformStream,
    TextEncoder,
    TextDecoder,
    structuredClone: (value: unknown) => deserialize(serialize(value)),
  });
});
afterAll(() => {
  Object.assign(global, original);
});

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 4, text: 4, reasoning: 0 },
};

it.each(["matches", "empty", "unavailable", "declined"])(
  "the pinned SDK emits a truthful fresh %s action event when model prose has no URL",
  async (status) => {
    const { streamText, simulateReadableStream, stepCountIs, tool } =
      await import("ai");
    const { MockLanguageModelV3 } = await import("ai/test");
    let step = 0;
    const model = new MockLanguageModelV3({
      doStream: async () => ({
        stream: simulateReadableStream<ProviderChunk>({
          initialDelayInMs: null,
          chunkDelayInMs: null,
          chunks:
            step++ === 0
              ? [
                  { type: "stream-start", warnings: [] },
                  {
                    type: "tool-call",
                    toolCallId: "lookup-1",
                    toolName: "searchProducts",
                    input: '{"query":"PETG"}',
                  },
                  {
                    type: "finish",
                    finishReason: { unified: "tool-calls", raw: "tool_calls" },
                    usage,
                  },
                ]
              : [
                  { type: "stream-start", warnings: [] },
                  { type: "text-start", id: "reply" },
                  {
                    type: "text-delta",
                    id: "reply",
                    delta: "Which printer do you have?",
                  },
                  { type: "text-end", id: "reply" },
                  {
                    type: "finish",
                    finishReason: { unified: "stop", raw: "stop" },
                    usage,
                  },
                ],
        }),
      }),
    });
    const fetcher = jest.fn(
      async () =>
        ({
          ok: status !== "unavailable",
          json: async () => ({
            status,
            mode: "search",
            query: "PETG",
            products:
              status === "matches"
                ? [
                    {
                      id: "prod_petg",
                      title: "PETG",
                      handle: "petg",
                      productUrl: "https://store.example/products/petg",
                    },
                  ]
                : [],
          }),
        }) as Response,
    );
    const search = createProductSearchExecution({
      backendUrl: "http://127.0.0.1:9",
      internalToken: "fixture-token",
      storefrontOrigin: "https://store.example",
      lookupAllowed: status !== "declined",
      signal: new AbortController().signal,
      fetcher,
    });
    const result = streamText({
      model,
      prompt: "Send me a PETG page",
      stopWhen: stepCountIs(3),
      tools: {
        searchProducts: tool({
          inputSchema: z.object({ query: z.string() }),
          execute: search.execute,
        }),
      },
    });
    const chunks = [];
    const stream = result
      .toUIMessageStream({ generateMessageId: () => "answer-1" })
      .pipeThrough(createProductActionTransform(search.results, "answer-1"));
    const reader = stream.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    expect(await result.text).not.toContain("http");
    const events = chunks.filter(
      (chunk) => chunk.type === "data-product-search",
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      transient: true,
      data: {
        messageId: "answer-1",
        status,
        products:
          status === "matches"
            ? [expect.objectContaining({ href: "/products/petg" })]
            : [],
      },
    });
    expect(fetcher).toHaveBeenCalledTimes(status === "declined" ? 0 : 1);
    expect(model.doStreamCalls).toHaveLength(2);
  },
);
