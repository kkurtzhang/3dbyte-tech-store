const startNodeTracingAsyncMock = jest.fn()

jest.mock("@3dbyte-tech-store/observability", () => ({
  startNodeTracingAsync: (options: unknown) => startNodeTracingAsyncMock(options),
}))

describe("storefront node instrumentation", () => {
  const originalEnv = process.env
  const originalInfo = console.info

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    console.info = jest.fn()
    process.env = {
      ...originalEnv,
      VERCEL_GIT_COMMIT_SHA: "5d2e4cf",
    }
  })

  afterAll(() => {
    console.info = originalInfo
    process.env = originalEnv
  })

  it("logs a sanitized tracing startup summary for staging verification", async () => {
    startNodeTracingAsyncMock.mockResolvedValueOnce({
      config: {
        enabled: true,
        environment: "staging",
        langfuse: {
          environment: "staging",
          host: "http://observability.tailnet.local:3000",
          publicKey: "pk-lf-test",
          secretKey: "sk-lf-test",
        },
        protocol: "http/protobuf",
        serviceName: "3dbyte-tech-store-storefront",
        tracesEndpoint: "http://observability.tailnet.local:4318/v1/traces",
      },
      started: true,
    })

    const { registerNodeTracing } = await import("../../instrumentation.node")

    await registerNodeTracing()

    expect(startNodeTracingAsyncMock).toHaveBeenCalledWith({
      serviceName: "3dbyte-tech-store-storefront",
      serviceVersion: "5d2e4cf",
    })
    expect(console.info).toHaveBeenCalledWith(
      "[observability] storefront tracing startup",
      {
        enabled: true,
        environment: "staging",
        langfuseConfigured: true,
        reason: undefined,
        serviceName: "3dbyte-tech-store-storefront",
        started: true,
        tracesEndpoint: "http://observability.tailnet.local:4318/v1/traces",
      },
    )
  })
})
