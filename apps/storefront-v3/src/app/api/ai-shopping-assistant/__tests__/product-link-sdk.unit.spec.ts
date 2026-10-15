import { ReadableStream, TransformStream } from "stream/web";
import { TextDecoder, TextEncoder } from "util";
import { deserialize, serialize } from "v8";
import { z } from "zod";

import { prepareProductLinkStep } from "../product-link-routing";

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 4, text: 4, reasoning: 0 },
};

it("the installed SDK searches once then permits a final answer with grounded links", async () => {
  const original = {
    structuredClone: global.structuredClone,
    ReadableStream: global.ReadableStream,
    TransformStream: global.TransformStream,
    TextDecoder: global.TextDecoder,
    TextEncoder: global.TextEncoder,
  };
  Object.assign(global, {
    structuredClone: (value: unknown) => deserialize(serialize(value)),
    ReadableStream,
    TransformStream,
    TextDecoder,
    TextEncoder,
  });
  const { generateText, stepCountIs, tool } = await import("ai");
  const { MockLanguageModelV3 } = await import("ai/test");
  const productUrl = "https://store.example/products/petg";
  const execute = jest.fn(async () => ({
    products: [{ title: "PETG", productUrl }],
  }));
  let step = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () =>
      step++ === 0
        ? {
            content: [
              {
                type: "tool-call",
                toolCallId: "lookup-1",
                toolName: "searchProducts",
                input: '{"query":"PETG"}',
              },
            ],
            finishReason: { unified: "tool-calls", raw: "tool_calls" },
            usage,
            warnings: [],
          }
        : {
            content: [
              {
                type: "text",
                text: `PETG options: ${productUrl}. Which printer do you use?`,
              },
            ],
            finishReason: { unified: "stop", raw: "stop" },
            usage,
            warnings: [],
          },
  });
  try {
    const prompt =
      "Can you send me the product page for the PETG you recommend?";
    const result = await generateText({
      model,
      prompt,
      stopWhen: stepCountIs(5),
      prepareStep: ({ stepNumber }) =>
        prepareProductLinkStep(prompt, stepNumber),
      tools: {
        searchProducts: tool({
          inputSchema: z.object({ query: z.string() }),
          execute,
        }),
      },
    });
    expect(result.text).toContain(productUrl);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(model.doGenerateCalls.map((call) => call.toolChoice)).toEqual([
      { type: "tool", toolName: "searchProducts" },
      { type: "auto" },
    ]);
    expect(model.doGenerateCalls[1].prompt).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "tool",
          content: expect.arrayContaining([
            expect.objectContaining({
              toolName: "searchProducts",
              output: {
                type: "json",
                value: { products: [{ title: "PETG", productUrl }] },
              },
            }),
          ]),
        }),
      ]),
    );
  } finally {
    Object.assign(global, original);
  }
});
