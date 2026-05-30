import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter as GrpcTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPTraceExporter as HttpTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import type { Instrumentation } from "@opentelemetry/instrumentation";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  BatchSpanProcessor,
  type ReadableSpan,
  type SpanExporter,
  type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";

export {
  isAiTelemetryEnabled,
  resolveTracingConfig,
  type LangfuseTracingConfig,
  type ObservabilityEnv,
  type OtlpProtocol,
  type TracingConfig,
} from "./config";
import {
  type ObservabilityEnv,
  type TracingConfig,
  resolveTracingConfig,
} from "./config";

type StartNodeTracingOptions = {
  env?: ObservabilityEnv;
  instrumentations?: Array<Instrumentation | Instrumentation[]>;
  registerShutdownHandlers?: boolean;
  serviceName: string;
  serviceVersion?: string;
};

type StartNodeTracingResult = {
  config: TracingConfig;
  reason?: string;
  sdk?: NodeSDK;
  started: boolean;
};

type ObservabilityGlobal = typeof globalThis & {
  __THREE_DB_OBSERVABILITY__?: StartNodeTracingResult;
};

function getGlobalState() {
  return globalThis as ObservabilityGlobal;
}

function shouldExportLangfuseSpan({ otelSpan }: { otelSpan: ReadableSpan }) {
  const hasAiAttributes = Object.keys(otelSpan.attributes).some(
    (attribute) =>
      attribute.startsWith("ai.") || attribute.startsWith("gen_ai."),
  );
  const hasLangfuseAttributes = Object.keys(otelSpan.attributes).some(
    (attribute) => attribute.startsWith("langfuse."),
  );
  const operationName = otelSpan.attributes["operation.name"];
  const isAiOperation =
    typeof operationName === "string" && operationName.startsWith("ai.");

  return (
    hasAiAttributes ||
    hasLangfuseAttributes ||
    isAiOperation ||
    otelSpan.instrumentationScope.name === "ai"
  );
}

export function buildSpanProcessors(config: TracingConfig): SpanProcessor[] {
  const processors: SpanProcessor[] = [];
  const exporter = createTraceExporter(config);

  if (exporter) {
    processors.push(new BatchSpanProcessor(exporter));
  }

  return processors;
}

export function createTraceExporter(
  config: TracingConfig,
): SpanExporter | undefined {
  if (!config.tracesEndpoint) {
    return undefined;
  }

  return config.protocol === "grpc"
    ? new GrpcTraceExporter({ url: config.tracesEndpoint })
    : new HttpTraceExporter({ url: config.tracesEndpoint });
}

export async function buildSpanProcessorsAsync(
  config: TracingConfig,
): Promise<SpanProcessor[]> {
  const processors = buildSpanProcessors(config);

  if (config.langfuse) {
    const { LangfuseSpanProcessor } = await import("@langfuse/otel");

    processors.push(
      new LangfuseSpanProcessor({
        baseUrl: config.langfuse.host,
        environment: config.langfuse.environment,
        publicKey: config.langfuse.publicKey,
        secretKey: config.langfuse.secretKey,
        shouldExportSpan: shouldExportLangfuseSpan,
      }),
    );
  }

  return processors;
}

export function createOtelResource(config: TracingConfig) {
  return resourceFromAttributes(config.resourceAttributes);
}

export function createNodeAutoInstrumentations() {
  return getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-fs": {
      enabled: false,
    },
    "@opentelemetry/instrumentation-http": {
      ignoreIncomingRequestHook: (request: { url?: string }) =>
        request.url === "/health" || request.url === "/_health",
    },
  });
}

export function startNodeTracing({
  env = process.env,
  instrumentations = [],
  registerShutdownHandlers = true,
  serviceName,
  serviceVersion,
}: StartNodeTracingOptions): StartNodeTracingResult {
  const globalState = getGlobalState();

  if (globalState.__THREE_DB_OBSERVABILITY__) {
    return globalState.__THREE_DB_OBSERVABILITY__;
  }

  const config = resolveTracingConfig({
    env,
    serviceName,
    serviceVersion,
  });
  const spanProcessors = config.enabled ? buildSpanProcessors(config) : [];

  if (!config.enabled || spanProcessors.length === 0) {
    const result = {
      config,
      reason: config.reason,
      started: false,
    };

    globalState.__THREE_DB_OBSERVABILITY__ = result;
    return result;
  }

  const sdk = new NodeSDK({
    instrumentations,
    resource: createOtelResource(config),
    spanProcessors,
  });

  sdk.start();

  const result = {
    config,
    sdk,
    started: true,
  };

  globalState.__THREE_DB_OBSERVABILITY__ = result;

  if (registerShutdownHandlers) {
    process.once("SIGTERM", () => {
      void sdk.shutdown();
    });
    process.once("SIGINT", () => {
      void sdk.shutdown();
    });
  }

  return result;
}

export async function startNodeTracingAsync({
  env = process.env,
  instrumentations = [],
  registerShutdownHandlers = true,
  serviceName,
  serviceVersion,
}: StartNodeTracingOptions): Promise<StartNodeTracingResult> {
  const globalState = getGlobalState();

  if (globalState.__THREE_DB_OBSERVABILITY__) {
    return globalState.__THREE_DB_OBSERVABILITY__;
  }

  const config = resolveTracingConfig({
    env,
    serviceName,
    serviceVersion,
  });
  const spanProcessors = config.enabled
    ? await buildSpanProcessorsAsync(config)
    : [];

  if (!config.enabled || spanProcessors.length === 0) {
    const result = {
      config,
      reason: config.reason,
      started: false,
    };

    globalState.__THREE_DB_OBSERVABILITY__ = result;
    return result;
  }

  const sdk = new NodeSDK({
    instrumentations,
    resource: createOtelResource(config),
    spanProcessors,
  });

  sdk.start();

  const result = {
    config,
    sdk,
    started: true,
  };

  globalState.__THREE_DB_OBSERVABILITY__ = result;

  if (registerShutdownHandlers) {
    process.once("SIGTERM", () => {
      void sdk.shutdown();
    });
    process.once("SIGINT", () => {
      void sdk.shutdown();
    });
  }

  return result;
}
