/** @jest-environment node */
import type { TextStreamPart, ToolSet } from "ai";
import observed from "../__fixtures__/observed-answer-repetition.json";
import { createKnowledgeExecution } from "../knowledge-execution";
import {
  createKnowledgeGroundingTransform,
  assembleKnowledgeAnswer,
} from "../knowledge-grounding";
const now = Date.parse(observed.provenance.observedAt);
type Part = TextStreamPart<ToolSet>;
async function setup() {
  const e = createKnowledgeExecution(
    async () => observed.cases[1].knowledge,
    () => now,
  );
  await e.execute({ query: "Magigoo" }, { toolCallId: "fresh" });
  return e;
}
beforeEach(() => jest.spyOn(Date, "now").mockReturnValue(now));
afterEach(() => jest.restoreAllMocks());
it("streams tool status while holding all prose and sources until asynchronous validation finishes", async () => {
  const e = await setup();
  let release!: () => void;
  const pending = new Promise<void>((r) => {
    release = r;
  });
  const answer = {
    ...assembleKnowledgeAnswer(e, "PETG on glass", now),
    text: "A useful reviewed answer.",
    origin: "reviewed_llm_synthesis" as const,
  };
  const onAnswer = jest.fn();
  const onText = jest.fn();
  const stream = createKnowledgeGroundingTransform(
    e,
    [],
    { onAnswer, onText },
    {
      requiresKnowledge: true,
      resolveAnswer: async () => {
        await pending;
        return answer;
      },
    },
  )();
  const parts: Part[] = [];
  const reader = stream.readable.getReader();
  const reading = (async () => {
    for (;;) {
      const v = await reader.read();
      if (v.done) return;
      parts.push(v.value);
    }
  })();
  const writer = stream.writable.getWriter();
  await writer.write({
    type: "text-delta",
    id: "raw",
    text: "UNREVIEWED false claim",
  } as Part);
  await writer.write({
    type: "tool-call",
    toolName: "searchKnowledge",
    toolCallId: "x",
    input: { query: "q" },
  } as Part);
  await writer.write({
    type: "source",
    sourceType: "url",
    id: "forged",
    url: "https://forged.example",
    title: "forged",
  } as Part);
  const finished = writer.write({
    type: "finish",
    finishReason: "stop",
  } as Part);
  await new Promise((r) => setTimeout(r, 0));
  expect(parts.map((p) => p.type)).toEqual(["tool-call"]);
  expect(onText).not.toHaveBeenCalled();
  release();
  await finished;
  await writer.close();
  await reading;
  expect(
    parts.flatMap((p) => (p.type === "text-delta" ? [p.text] : [])).join(""),
  ).toBe(answer.text);
  expect(parts.findIndex((p) => p.type === "source")).toBeGreaterThan(
    parts.findIndex((p) => p.type === "text-end"),
  );
  expect(parts).not.toContainEqual(expect.objectContaining({ id: "forged" }));
  expect(onAnswer).toHaveBeenCalledWith("reviewed_llm_synthesis");
});
it("discards an asynchronous result after caller abort instead of leaking a stale answer", async () => {
  const e = await setup();
  const abort = new AbortController();
  const stream = createKnowledgeGroundingTransform(
    e,
    [],
    {},
    {
      signal: abort.signal,
      requiresKnowledge: true,
      resolveAnswer: async () => {
        abort.abort();
        return {
          ...assembleKnowledgeAnswer(e, "", now),
          origin: "reviewed_llm_synthesis",
        };
      },
    },
  )();
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  const parts: Part[] = [];
  const reading = (async () => {
    for (;;) {
      const v = await reader.read();
      if (v.done) return;
      parts.push(v.value);
    }
  })();
  await writer.write({ type: "finish", finishReason: "stop" } as Part);
  await writer.close();
  await reading;
  expect(parts).not.toContainEqual(
    expect.objectContaining({ type: "text-delta" }),
  );
  expect(parts).not.toContainEqual(expect.objectContaining({ type: "source" }));
});
it("preserves useful baseline text when the resolver fails", async () => {
  const e = await setup();
  const stream = createKnowledgeGroundingTransform(
    e,
    [],
    {},
    {
      question: "Can I use Magigoo for PETG on glass?",
      requiresKnowledge: true,
      resolveAnswer: async () => {
        throw new Error("private detail");
      },
    },
  )();
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  const texts: string[] = [];
  const reading = (async () => {
    for (;;) {
      const v = await reader.read();
      if (v.done) return;
      if (v.value.type === "text-delta") texts.push(v.value.text);
    }
  })();
  await writer.write({ type: "finish", finishReason: "stop" } as Part);
  await writer.close();
  await reading;
  expect(texts.join("")).toContain("PETG");
  expect(texts.join("")).not.toContain("private detail");
});
