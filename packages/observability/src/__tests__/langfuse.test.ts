const mockActiveSetAttribute = jest.fn();
const mockFallbackSetAttribute = jest.fn();
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

import {
  createActiveLangfuseTraceAttributeWriter,
  getActiveLangfuseTraceId,
  setActiveLangfuseTraceAttributes,
} from "../langfuse";

describe("Langfuse trace attributes", () => {
  beforeEach(() => {
    mockActiveSetAttribute.mockClear();
    mockFallbackSetAttribute.mockClear();
    mockGetActiveSpan.mockReset();
    mockGetActiveSpan.mockReturnValue(mockActiveSpan);
  });

  it("sets trace input and output attributes for top-level Langfuse debugging", () => {
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

    expect(mockActiveSetAttribute).toHaveBeenCalledWith(
      "langfuse.trace.input",
      JSON.stringify({
        latestUserMessage: "Which PETG should I use outside?",
        messageCount: 1,
      }),
    );
    expect(mockActiveSetAttribute).toHaveBeenCalledWith(
      "langfuse.trace.output",
      JSON.stringify({
        assistantText: "Use PETG and avoid PLA for warm outdoor parts.",
        finishReason: "stop",
      }),
    );
  });

  it("keeps trace output on the request span when stream finish runs inside a generation span", () => {
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

    expect(mockFallbackSetAttribute).toHaveBeenCalledWith(
      "langfuse.trace.output",
      JSON.stringify({
        assistantText: "Use PETG and dry it before printing.",
        finishReason: "stop",
      }),
    );
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
    expect(getActiveLangfuseTraceId()).toBe("active-trace-id");
  });
});
