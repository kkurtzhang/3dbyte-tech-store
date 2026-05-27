const langfuseSpanProcessorMock = jest.fn().mockImplementation((config) => ({
  config,
}))

jest.mock("@langfuse/otel", () => ({
  LangfuseSpanProcessor: langfuseSpanProcessorMock,
}))

import { buildSpanProcessorsAsync } from "../node"
import type { TracingConfig } from "../config"

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
  }
}

describe("observability node tracing", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("exports AI SDK v6 spans with ai.* attributes to Langfuse", async () => {
    await buildSpanProcessorsAsync(createLangfuseConfig())

    const processorConfig = langfuseSpanProcessorMock.mock.calls[0]?.[0]

    expect(processorConfig.shouldExportSpan({
      otelSpan: {
        attributes: {
          "ai.operationId": "ai.streamText",
          "operation.name": "storefront.ai-shopping-assistant",
        },
        instrumentationScope: { name: "@ai-sdk/core" },
      },
    })).toBe(true)
    expect(processorConfig.shouldExportSpan({
      otelSpan: {
        attributes: {
          "http.route": "/shop",
        },
        instrumentationScope: { name: "next" },
      },
    })).toBe(false)
  })
})
