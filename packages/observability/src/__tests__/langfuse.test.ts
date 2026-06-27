const mockGetActiveTraceId = jest.fn(
  (): string | undefined => "official-active-trace-id",
);
const mockPropagateAttributes = jest.fn((_attributes, fn) => fn());
const mockUpdateActiveObservation = jest.fn();
const mockStartedObservation = {
  end: jest.fn(),
  traceId: "started-trace-id",
  update: jest.fn(),
};
const mockStartActiveObservation = jest.fn((_name, fn, _options) =>
  fn(mockStartedObservation),
);
const mockActiveSpan = {
  spanContext: () => ({ traceId: "active-trace-id" }),
};
const mockGetActiveSpan = jest.fn(() => mockActiveSpan);

jest.mock("@opentelemetry/api", () => ({
  trace: {
    getActiveSpan: mockGetActiveSpan,
  },
}));

jest.mock("@langfuse/tracing", () => ({
  getActiveTraceId: () => mockGetActiveTraceId(),
  propagateAttributes: (attributes, fn) =>
    mockPropagateAttributes(attributes, fn),
  startActiveObservation: (name, fn, options) =>
    mockStartActiveObservation(name, fn, options),
  updateActiveObservation: (attributes, options) =>
    mockUpdateActiveObservation(attributes, options),
}));

import {
  getActiveLangfuseTraceId,
  propagateActiveLangfuseTraceAttributes,
  startActiveLangfuseTraceObservation,
  updateActiveLangfuseGeneration,
} from "../langfuse";

describe("Langfuse trace attributes", () => {
  beforeEach(() => {
    mockGetActiveTraceId.mockClear();
    mockPropagateAttributes.mockClear();
    mockUpdateActiveObservation.mockClear();
    mockStartedObservation.end.mockClear();
    mockStartedObservation.update.mockClear();
    mockStartActiveObservation.mockClear();
    mockGetActiveSpan.mockReset();
    mockGetActiveSpan.mockReturnValue(mockActiveSpan);
  });

  it("updates the active generation through the official Langfuse helper", () => {
    updateActiveLangfuseGeneration({
      metadata: {
        deepseek_cache_hit_ratio: 0.25,
        finish_reason: "stop",
        ignored: undefined,
      },
      model: "deepseek-v4-flash",
      usageDetails: {
        input_cache_hit_tokens: 20,
        input_cache_miss_tokens: 80,
        output: 40,
      },
    });

    expect(mockUpdateActiveObservation).toHaveBeenCalledWith(
      {
        metadata: {
          deepseek_cache_hit_ratio: 0.25,
          finish_reason: "stop",
        },
        model: "deepseek-v4-flash",
        usageDetails: {
          input_cache_hit_tokens: 20,
          input_cache_miss_tokens: 80,
          output: 40,
        },
      },
      { asType: "generation" },
    );
  });

  it("drops invalid numeric generation details", () => {
    updateActiveLangfuseGeneration({
      costDetails: {
        input: Number.NaN,
        output: 0.01,
      },
      usageDetails: {
        input_cache_hit_tokens: 20,
        input_cache_miss_tokens: Number.POSITIVE_INFINITY,
      },
    });

    expect(mockUpdateActiveObservation).toHaveBeenCalledWith(
      {
        costDetails: { output: 0.01 },
        usageDetails: { input_cache_hit_tokens: 20 },
      },
      { asType: "generation" },
    );
  });

  it("forwards generation input, output, and status fields", () => {
    updateActiveLangfuseGeneration({
      input: "Which PETG should I use?",
      level: "WARNING",
      output: "Use a dry PETG spool.",
      statusMessage: "Cache data was unavailable",
    });

    expect(mockUpdateActiveObservation).toHaveBeenCalledWith(
      {
        input: "Which PETG should I use?",
        level: "WARNING",
        output: "Use a dry PETG spool.",
        statusMessage: "Cache data was unavailable",
      },
      { asType: "generation" },
    );
  });

  it("exposes the active trace id for score attachment", () => {
    expect(getActiveLangfuseTraceId()).toBe("official-active-trace-id");
  });

  it("falls back to the active OpenTelemetry trace id", () => {
    mockGetActiveTraceId.mockReturnValueOnce(undefined);

    expect(getActiveLangfuseTraceId()).toBe("active-trace-id");
  });

  it("propagates supported trace organization attributes through the official helper", async () => {
    await propagateActiveLangfuseTraceAttributes(
      {
        metadata: {
          chatbot_id: "storefront.shopping-assistant",
          langfuse_prompt_version: 3,
          ignored_object: { value: "too large" },
        },
        name: "storefront.ai-shopping-assistant",
        sessionId: "customer-ai-eval-session",
        tags: ["ai-chatbot", "storefront"],
        userId: "customer-1",
      },
      async () => "ok",
    );

    expect(mockPropagateAttributes).toHaveBeenCalledWith(
      {
        metadata: {
          chatbot_id: "storefront.shopping-assistant",
          langfuse_prompt_version: "3",
        },
        sessionId: "customer-ai-eval-session",
        tags: ["ai-chatbot", "storefront"],
        traceName: "storefront.ai-shopping-assistant",
        userId: "customer-1",
      },
      expect.any(Function),
    );
  });

  it("starts a non-auto-ending active trace observation for streaming routes", async () => {
    const result = await startActiveLangfuseTraceObservation(
      "storefront.ai-shopping-assistant",
      async (observation) => {
        observation.update({
          input: "Which PETG should I use outside?",
        });
        observation.end();
        return observation.traceId;
      },
    );

    expect(result).toBe("started-trace-id");
    expect(mockStartActiveObservation).toHaveBeenCalledWith(
      "storefront.ai-shopping-assistant",
      expect.any(Function),
      {
        asType: "span",
        endOnExit: false,
      },
    );
    expect(mockStartedObservation.update).toHaveBeenCalledWith({
      input: "Which PETG should I use outside?",
    });
    expect(mockStartedObservation.end).toHaveBeenCalledTimes(1);
  });
});
