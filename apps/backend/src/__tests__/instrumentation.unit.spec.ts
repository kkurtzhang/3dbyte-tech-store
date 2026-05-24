const registerOtelMock = jest.fn();
const resolveTracingConfigMock = jest.fn();
const createOtelResourceMock = jest.fn();
const createTraceExporterMock = jest.fn();

jest.mock("@medusajs/medusa", () => ({
  registerOtel: (config: unknown) => registerOtelMock(config),
}));

jest.mock(
  "@3dbyte-tech-store/observability",
  () => ({
    createOtelResource: (config: unknown) => createOtelResourceMock(config),
    createTraceExporter: (config: unknown) => createTraceExporterMock(config),
    resolveTracingConfig: (options: unknown) =>
      resolveTracingConfigMock(options),
  }),
  { virtual: true },
);

describe("backend instrumentation", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("registers Medusa OpenTelemetry when tracing is enabled", async () => {
    const tracingConfig = {
      enabled: true,
      serviceName: "3dbyte-tech-store-backend",
    };
    resolveTracingConfigMock.mockReturnValue(tracingConfig);
    createTraceExporterMock.mockReturnValue("trace-exporter");
    createOtelResourceMock.mockReturnValue("resource");

    const { register } = await import("../../instrumentation");

    register();

    expect(resolveTracingConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: "3dbyte-tech-store-backend",
      }),
    );
    expect(createTraceExporterMock).toHaveBeenCalledWith(tracingConfig);
    expect(createOtelResourceMock).toHaveBeenCalledWith(tracingConfig);
    expect(registerOtelMock).toHaveBeenCalledWith({
      serviceName: "3dbyte-tech-store-backend",
      exporter: "trace-exporter",
      resource: "resource",
      instrument: {
        cache: true,
        db: true,
        http: true,
        query: true,
        workflows: true,
      },
    });
  });

  it("does not register Medusa OpenTelemetry without tracing env", async () => {
    resolveTracingConfigMock.mockReturnValue({
      enabled: false,
      reason: "No OTLP or Langfuse configuration found",
      serviceName: "3dbyte-tech-store-backend",
    });

    const { register } = await import("../../instrumentation");

    register();

    expect(registerOtelMock).not.toHaveBeenCalled();
    expect(createTraceExporterMock).toHaveBeenCalled();
    expect(createOtelResourceMock).not.toHaveBeenCalled();
  });
});
