const langfuseSpanProcessorMock = jest.fn().mockImplementation((config) => ({
  config,
}));
const isDefaultExportSpanMock = jest.fn(
  (span: { attributes: Record<string, unknown> }) =>
    span.attributes["langfuse.default"] === true,
);

jest.mock("@langfuse/otel", () => ({
  isDefaultExportSpan: isDefaultExportSpanMock,
  LangfuseSpanProcessor: langfuseSpanProcessorMock,
}));

import {
  buildSpanProcessorsAsync,
  createNodeAutoInstrumentations,
} from "../node";
import type { TracingConfig } from "../config";

function createLangfuseConfig(): TracingConfig {
  return {
    enabled: true,
    environment: "staging",
    langfuse: {
      environment: "staging",
      host: "http://observability.tailnet.local:3000",
      publicKey: "pk-lf-test",
      secretKey: "sk-lf-test",
    },
    protocol: "http/protobuf",
    resourceAttributes: {},
    serviceName: "3dbyte-tech-store-storefront",
  };
}

describe("observability node tracing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isDefaultExportSpanMock.mockImplementation(
      (span: { attributes: Record<string, unknown> }) =>
        span.attributes["langfuse.default"] === true,
    );
  });

  it("composes AI SDK v6 span detection with the Langfuse default filter", async () => {
    await buildSpanProcessorsAsync(createLangfuseConfig());

    const processorConfig = langfuseSpanProcessorMock.mock.calls[0]?.[0];

    expect(
      processorConfig.shouldExportSpan({
        otelSpan: {
          attributes: {
            "http.route": "/shop",
            "langfuse.default": true,
          },
          instrumentationScope: { name: "next" },
        },
      }),
    ).toBe(true);
    expect(
      processorConfig.shouldExportSpan({
        otelSpan: {
          attributes: {
            "ai.operationId": "ai.streamText",
            "operation.name": "storefront.ai-shopping-assistant",
          },
          instrumentationScope: { name: "@ai-sdk/core" },
        },
      }),
    ).toBe(true);
    expect(isDefaultExportSpanMock).toHaveBeenCalled();
    expect(
      processorConfig.shouldExportSpan({
        otelSpan: {
          attributes: {
            "http.route": "/shop",
          },
          instrumentationScope: { name: "next" },
        },
      }),
    ).toBe(false);
    expect(
      processorConfig.shouldExportSpan({
        otelSpan: {
          attributes: {
            "http.route": "/api/ai-shopping-assistant",
            "langfuse.trace.name": "storefront.ai-shopping-assistant",
          },
          instrumentationScope: { name: "next" },
        },
      }),
    ).toBe(true);
  });
});

describe("node auto-instrumentation compatibility", () => {
  it("retains database instrumentation and excludes filesystem instrumentation", () => {
    const instrumentations = createNodeAutoInstrumentations();
    const names = instrumentations.map((entry) => entry.instrumentationName);
    expect(names).toContain("@opentelemetry/instrumentation-pg");
    expect(names).toContain("@opentelemetry/instrumentation-mysql2");
    expect(names).not.toContain("@opentelemetry/instrumentation-fs");
    const http = instrumentations.find(
      (entry) =>
        entry.instrumentationName === "@opentelemetry/instrumentation-http",
    );
    const config = http?.getConfig() as {
      ignoreIncomingRequestHook: (request: { url: string }) => boolean;
    };
    expect(config.ignoreIncomingRequestHook({ url: "/health" })).toBe(true);
    expect(config.ignoreIncomingRequestHook({ url: "/_health" })).toBe(true);
    expect(config.ignoreIncomingRequestHook({ url: "/store/products" })).toBe(
      false,
    );
    for (const instrumentation of instrumentations) instrumentation.disable();
  });
});
