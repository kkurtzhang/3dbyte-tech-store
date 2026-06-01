const mockActiveSetAttribute = jest.fn();
const mockFallbackSetAttribute = jest.fn();
const mockGetActiveTraceId = jest.fn(() => "official-active-trace-id");
const mockPropagateAttributes = jest.fn((_attributes, fn) => fn());
const mockSetActiveTraceIO = jest.fn();
const mockStartedObservation = {
  end: jest.fn(),
  traceId: "started-trace-id",
};
const mockStartActiveObservation = jest.fn((_name, fn, _options) =>
  fn(mockStartedObservation),
);
const mockActiveSpan = {
  setAttribute: mockActiveSetAttribute,
  spanContext: () => ({ traceId: "active-trace-id" }),
};
const mockFallbackSpan = {
  setAttribute: mockFallbackSetAttribute,
  spanContext: () => ({ traceId: "fallback-trace-id" }),
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
  setActiveTraceIO: (attributes) => mockSetActiveTraceIO(attributes),
  startActiveObservation: (name, fn, options) =>
    mockStartActiveObservation(name, fn, options),
}));

import {
  createActiveLangfuseTraceAttributeWriter,
  getActiveLangfuseTraceId,
  propagateActiveLangfuseTraceAttributes,
  setActiveLangfuseTraceAttributes,
  startActiveLangfuseTraceObservation,
} from "../langfuse";

describe("Langfuse trace attributes", () => {
  beforeEach(() => {
    mockActiveSetAttribute.mockClear();
    mockFallbackSetAttribute.mockClear();
    mockGetActiveTraceId.mockClear();
    mockPropagateAttributes.mockClear();
    mockSetActiveTraceIO.mockClear();
    mockStartedObservation.end.mockClear();
    mockStartActiveObservation.mockClear();
    mockGetActiveSpan.mockReset();
    mockGetActiveSpan.mockReturnValue(mockActiveSpan);
  });

  it("sets trace input and output through the official Langfuse trace IO helper", () => {
    setActiveLangfuseTraceAttributes({
      input: {
        latestUserMessage: "Which PETG should I use outside?",
        messageCount: 1,
      },
      output: {
        assistantText: "Use PETG and avoid PLA for warm outdoor parts.",
        finishReason: "stop",
      },
    });

    expect(mockSetActiveTraceIO).toHaveBeenCalledWith({
      input: {
        latestUserMessage: "Which PETG should I use outside?",
        messageCount: 1,
      },
    });
    expect(mockSetActiveTraceIO).toHaveBeenCalledWith({
      output: {
        assistantText: "Use PETG and avoid PLA for warm outdoor parts.",
        finishReason: "stop",
      },
    });
  });

  it("writes stream-finish trace output from the active generation context", () => {
    mockGetActiveSpan.mockReturnValueOnce(mockFallbackSpan);
    const writeTraceAttributes = createActiveLangfuseTraceAttributeWriter();
    mockGetActiveSpan.mockReturnValue(mockActiveSpan);

    writeTraceAttributes({
      model: "deepseek-v4-flash",
      output: {
        assistantText: "Use PETG and dry it before printing.",
        finishReason: "stop",
      },
      usageDetails: {
        input_cache_hit_tokens: 20,
        input_cache_miss_tokens: 80,
        output: 40,
      },
    });

    expect(mockSetActiveTraceIO).toHaveBeenCalledWith({
      output: {
        assistantText: "Use PETG and dry it before printing.",
        finishReason: "stop",
      },
    });
    expect(mockActiveSetAttribute).toHaveBeenCalledWith(
      "langfuse.observation.model.name",
      "deepseek-v4-flash",
    );
    expect(mockActiveSetAttribute).toHaveBeenCalledWith(
      "langfuse.observation.usage_details",
      JSON.stringify({
        input_cache_hit_tokens: 20,
        input_cache_miss_tokens: 80,
        output: 40,
      }),
    );
  });

  it("exposes the active trace id for score attachment", () => {
    expect(getActiveLangfuseTraceId()).toBe("official-active-trace-id");
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
    expect(mockStartedObservation.end).toHaveBeenCalledTimes(1);
  });
});
