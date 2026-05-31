const setAttributeMock = jest.fn();
const activeSpan = {
  setAttribute: setAttributeMock,
};

jest.mock("@opentelemetry/api", () => ({
  trace: {
    getActiveSpan: jest.fn(() => activeSpan),
  },
}));

import { setActiveLangfuseTraceAttributes } from "../langfuse";

describe("Langfuse trace attributes", () => {
  beforeEach(() => {
    setAttributeMock.mockClear();
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

    expect(setAttributeMock).toHaveBeenCalledWith(
      "langfuse.trace.input",
      JSON.stringify({
        latestUserMessage: "Which PETG should I use outside?",
        messageCount: 1,
      }),
    );
    expect(setAttributeMock).toHaveBeenCalledWith(
      "langfuse.trace.output",
      JSON.stringify({
        assistantText: "Use PETG and avoid PLA for warm outdoor parts.",
        finishReason: "stop",
      }),
    );
  });
});
