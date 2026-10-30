/** @jest-environment node */
import { generateText } from "ai";
import observed from "../__fixtures__/observed-answer-repetition.json";
import { createKnowledgeExecution } from "../knowledge-execution";
import { createCommerceExecution } from "../commerce-execution";
import {
  createSynthesisResolver,
  synthesisMetadata,
} from "../synthesis-provider";
import {
  SYNTHESIS_PROMPT_VERSION,
  SYNTHESIS_VALIDATOR_VERSION,
} from "../synthesis-contract";
import { isSynthesisEnabled } from "../grounded-synthesis";
import type { LanguageModel } from "ai";
jest.mock("ai", () => ({ generateText: jest.fn() }));
jest.mock("@3dbyte-tech-store/observability", () => ({
  isAiTelemetryEnabled: () => false,
}));
const env = process.env;
afterEach(() => {
  process.env = env;
  jest.resetAllMocks();
});
it("requires the exact server-side true flag; flag off makes no additional provider requests", () => {
  for (const value of [undefined, "false", "1", "TRUE", ""])
    expect(
      isSynthesisEnabled({ AI_ASSISTANT_GROUNDED_SYNTHESIS_ENABLED: value }),
    ).toBe(false);
  process.env = { ...env, AI_ASSISTANT_GROUNDED_SYNTHESIS_ENABLED: "false" };
  const resolve = createSynthesisResolver({
    model: "synthetic" as LanguageModel,
    execution: createKnowledgeExecution(async () => null),
    commerce: createCommerceExecution(async () => null),
    suppliedEmails: [],
    question: "Can I use this?",
  });
  expect(resolve).toBeUndefined();
  expect(generateText).not.toHaveBeenCalled();
});
it("uses the existing model without tools, SDK retries or draft I/O telemetry and keeps remote tone out of review", async () => {
  process.env = { ...env, AI_ASSISTANT_GROUNDED_SYNTHESIS_ENABLED: "true" };
  const now = Date.parse(observed.provenance.observedAt);
  const execution = createKnowledgeExecution(
    async () => observed.cases[1].knowledge,
    () => now,
  );
  await execution.execute({ query: "Magigoo" }, { toolCallId: "fresh" });
  const mock = jest.mocked(generateText);
  mock.mockResolvedValueOnce({
    text: JSON.stringify({
      segments: [
        {
          kind: "fact",
          text: "{{product}} supports PETG on glass.",
          productKey: "p1",
          evidenceIds: ["f1"],
        },
      ],
    }),
    totalUsage: { inputTokens: 20, outputTokens: 10 },
  } as Awaited<ReturnType<typeof generateText>>);
  mock.mockResolvedValueOnce({
    text: JSON.stringify({
      verdict: "accept",
      findings: [],
      coverage: [{ index: 0, supported: true, evidenceIds: ["f1"] }],
    }),
    totalUsage: { inputTokens: 30, outputTokens: 8 },
  } as Awaited<ReturnType<typeof generateText>>);
  const onOutcome = jest.fn();
  const resolver = createSynthesisResolver({
    model: "same-configured-model" as LanguageModel,
    execution,
    commerce: createCommerceExecution(async () => null),
    suppliedEmails: [],
    question: "Can I use Magigoo Original for PETG on glass?",
    tone: "Editable tone fixture",
    now: () => now,
    onOutcome,
  })!;
  expect((await resolver())?.origin).toBe("reviewed_llm_synthesis");
  expect(mock).toHaveBeenCalledTimes(2);
  for (const [config] of mock.mock.calls) {
    expect(config).toMatchObject({
      model: "same-configured-model",
      maxRetries: 0,
      experimental_telemetry: {
        recordInputs: false,
        recordOutputs: false,
        metadata: {
          synthesis_prompt_version: SYNTHESIS_PROMPT_VERSION,
          synthesis_validator_version: SYNTHESIS_VALIDATOR_VERSION,
        },
      },
    });
    expect(config).not.toHaveProperty("tools");
  }
  expect(mock.mock.calls[0][0].system).toContain("Editable tone fixture");
  expect(mock.mock.calls[1][0].system).not.toContain("Editable tone fixture");
  expect(onOutcome).toHaveBeenCalledWith(
    expect.objectContaining({
      reason: "accepted",
      calls: 2,
      inputTokens: 50,
      outputTokens: 18,
    }),
  );
  expect(synthesisMetadata().grounded_synthesis_enabled).toBe(true);
});
it("excludes mixed commerce and supplied emails from extra synthesis passes", async () => {
  process.env = { ...env, AI_ASSISTANT_GROUNDED_SYNTHESIS_ENABLED: "true" };
  const commerce = createCommerceExecution(async () => null);
  for (const emails of [["synthetic@example.test"], []]) {
    if (!emails.length) commerce.summaries.set("order", "order fixture");
    const resolver = createSynthesisResolver({
      model: "synthetic" as LanguageModel,
      execution: createKnowledgeExecution(async () => null),
      commerce,
      suppliedEmails: emails,
      question: "Magigoo",
    })!;
    expect(await resolver()).toBeUndefined();
  }
  expect(generateText).not.toHaveBeenCalled();
});
