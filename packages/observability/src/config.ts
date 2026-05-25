export type ObservabilityEnv = Record<string, string | undefined>;

export type OtlpProtocol = "grpc" | "http/protobuf";

export type LangfuseTracingConfig = {
  environment: string;
  host: string;
  publicKey: string;
  secretKey: string;
};

export type TracingConfig = {
  enabled: boolean;
  environment: string;
  langfuse?: LangfuseTracingConfig;
  protocol: OtlpProtocol;
  reason?: string;
  resourceAttributes: Record<string, string>;
  serviceName: string;
  serviceVersion?: string;
  tracesEndpoint?: string;
};

type ResolveTracingOptions = {
  env?: ObservabilityEnv;
  serviceName: string;
  serviceVersion?: string;
};

const DASHBOARD_HOSTS = new Set([
  "insights.3dbytetech.com.au",
  "observe.3dbytetech.com.au",
]);

function getEnvValue(env: ObservabilityEnv, key: string) {
  const value = env[key]?.trim();

  return value ? value : undefined;
}

function isExplicitlyDisabled(env: ObservabilityEnv) {
  return (
    getEnvValue(env, "OTEL_SDK_DISABLED") === "true" ||
    getEnvValue(env, "OTEL_TRACING_ENABLED") === "false"
  );
}

function isDashboardHostname(value: string | undefined) {
  if (!value) {
    return false;
  }

  try {
    return DASHBOARD_HOSTS.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function resolveProtocol(env: ObservabilityEnv): OtlpProtocol {
  const protocol =
    getEnvValue(env, "OTEL_EXPORTER_OTLP_TRACES_PROTOCOL") ??
    getEnvValue(env, "OTEL_EXPORTER_OTLP_PROTOCOL") ??
    "http/protobuf";

  return protocol === "grpc" ? "grpc" : "http/protobuf";
}

function resolveTracesEndpoint(env: ObservabilityEnv, protocol: OtlpProtocol) {
  const explicitEndpoint = getEnvValue(
    env,
    "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
  );

  if (explicitEndpoint) {
    return stripTrailingSlash(explicitEndpoint);
  }

  const baseEndpoint = getEnvValue(env, "OTEL_EXPORTER_OTLP_ENDPOINT");

  if (!baseEndpoint) {
    return undefined;
  }

  const normalizedEndpoint = stripTrailingSlash(baseEndpoint);

  if (protocol === "grpc" || normalizedEndpoint.endsWith("/v1/traces")) {
    return normalizedEndpoint;
  }

  return `${normalizedEndpoint}/v1/traces`;
}

function resolveLangfuseConfig(
  env: ObservabilityEnv,
  environment: string,
): LangfuseTracingConfig | undefined {
  const host = getEnvValue(env, "LANGFUSE_HOST");
  const publicKey = getEnvValue(env, "LANGFUSE_PUBLIC_KEY");
  const secretKey = getEnvValue(env, "LANGFUSE_SECRET_KEY");

  if (!host || !publicKey || !secretKey) {
    return undefined;
  }

  return {
    environment,
    host: stripTrailingSlash(host),
    publicKey,
    secretKey,
  };
}

function parseResourceAttributes(value: string | undefined) {
  if (!value) {
    return {};
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((attributes, entry) => {
      const separatorIndex = entry.indexOf("=");

      if (separatorIndex <= 0) {
        return attributes;
      }

      return {
        ...attributes,
        [entry.slice(0, separatorIndex).trim()]: entry
          .slice(separatorIndex + 1)
          .trim(),
      };
    }, {});
}

export function resolveTracingConfig({
  env = process.env,
  serviceName,
  serviceVersion,
}: ResolveTracingOptions): TracingConfig {
  const environment =
    getEnvValue(env, "OTEL_DEPLOYMENT_ENVIRONMENT") ??
    getEnvValue(env, "DEPLOYMENT_ENVIRONMENT") ??
    getEnvValue(env, "NODE_ENV") ??
    "development";
  const resolvedServiceName =
    getEnvValue(env, "OTEL_SERVICE_NAME") ?? serviceName;
  const resolvedServiceVersion =
    serviceVersion ??
    getEnvValue(env, "OTEL_SERVICE_VERSION") ??
    getEnvValue(env, "VERCEL_GIT_COMMIT_SHA") ??
    getEnvValue(env, "SOURCE_VERSION");
  const protocol = resolveProtocol(env);
  const tracesEndpoint = resolveTracesEndpoint(env, protocol);
  const langfuse = resolveLangfuseConfig(env, environment);
  const resourceAttributes = {
    ...parseResourceAttributes(getEnvValue(env, "OTEL_RESOURCE_ATTRIBUTES")),
    "deployment.environment": environment,
    "service.name": resolvedServiceName,
    "service.namespace": "3dbyte-tech-store",
    ...(resolvedServiceVersion
      ? { "service.version": resolvedServiceVersion }
      : {}),
  };

  if (isExplicitlyDisabled(env)) {
    return {
      enabled: false,
      environment,
      langfuse,
      protocol,
      reason:
        "Tracing is disabled by OTEL_SDK_DISABLED or OTEL_TRACING_ENABLED",
      resourceAttributes,
      serviceName: resolvedServiceName,
      serviceVersion: resolvedServiceVersion,
      tracesEndpoint,
    };
  }

  if (
    isDashboardHostname(tracesEndpoint) ||
    isDashboardHostname(getEnvValue(env, "OTEL_EXPORTER_OTLP_ENDPOINT")) ||
    isDashboardHostname(langfuse?.host)
  ) {
    return {
      enabled: false,
      environment,
      protocol,
      reason:
        "Cloudflare Access dashboard hostname cannot be used for SDK ingest",
      resourceAttributes,
      serviceName: resolvedServiceName,
      serviceVersion: resolvedServiceVersion,
    };
  }

  const enabled = Boolean(tracesEndpoint || langfuse);

  return {
    enabled,
    environment,
    langfuse,
    protocol,
    reason: enabled ? undefined : "No OTLP or Langfuse configuration found",
    resourceAttributes,
    serviceName: resolvedServiceName,
    serviceVersion: resolvedServiceVersion,
    tracesEndpoint,
  };
}

export function isAiTelemetryEnabled(env: ObservabilityEnv = process.env) {
  return resolveTracingConfig({
    env,
    serviceName: "3dbyte-tech-store-storefront",
  }).enabled;
}
