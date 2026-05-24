import { isAiTelemetryEnabled, resolveTracingConfig } from "../config";

describe("observability tracing config", () => {
  it("resolves the OCI OTLP HTTP endpoint from the shared collector endpoint", () => {
    const config = resolveTracingConfig({
      env: {
        NODE_ENV: "production",
        OTEL_EXPORTER_OTLP_ENDPOINT: "http://observability.tailnet.local:4318",
        OTEL_EXPORTER_OTLP_PROTOCOL: "http/protobuf",
      },
      serviceName: "3dbyte-tech-store-storefront",
      serviceVersion: "86de0ca",
    });

    expect(config.enabled).toBe(true);
    expect(config.tracesEndpoint).toBe(
      "http://observability.tailnet.local:4318/v1/traces",
    );
    expect(config.resourceAttributes).toEqual(
      expect.objectContaining({
        "deployment.environment": "production",
        "service.name": "3dbyte-tech-store-storefront",
        "service.namespace": "3dbyte-tech-store",
        "service.version": "86de0ca",
      }),
    );
  });

  it("rejects Cloudflare Access dashboard hostnames for SDK ingest", () => {
    const config = resolveTracingConfig({
      env: {
        OTEL_EXPORTER_OTLP_ENDPOINT: "https://observe.3dbytetech.com.au",
      },
      serviceName: "3dbyte-tech-store-backend",
    });

    expect(config.enabled).toBe(false);
    expect(config.reason).toContain("Cloudflare Access dashboard hostname");
  });

  it("enables Langfuse AI telemetry only when self-hosted credentials are configured", () => {
    expect(
      isAiTelemetryEnabled({
        LANGFUSE_HOST: "http://observability.tailnet.local:3000",
        LANGFUSE_PUBLIC_KEY: "pk-lf-test",
        LANGFUSE_SECRET_KEY: "sk-lf-test",
      }),
    ).toBe(true);

    expect(
      isAiTelemetryEnabled({
        LANGFUSE_HOST: "http://observability.tailnet.local:3000",
        LANGFUSE_PUBLIC_KEY: "pk-lf-test",
      }),
    ).toBe(false);
  });
});
